from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.shortcuts import render
from rest_framework.views import APIView
from account.models import *
from feed.serializers import *
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly,IsAuthenticated
from django.db import transaction

class PostView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        search_query = request.GET.get('q')
        filter_query = request.GET.get('query')
        filter_tag = request.GET.get('tag')
        author_id = request.GET.get('author_id')

        if search_query:
            posts = Post.objects.filter(is_active=True).filter(
                title__icontains=search_query).order_by('-id')

        elif filter_query:
            posts = Post.objects.filter(is_active=True).filter(
                title__icontains=filter_query).order_by('-id')

        elif filter_tag:
            posts = Post.objects.filter(is_active=True).filter(tag=filter_tag).order_by('-id')

        elif filter_query and filter_tag:
            posts = Post.objects.filter(is_active=True).filter(
                title__icontains=filter_query).filter(tag=filter_tag).order_by('-id')
            
        elif author_id:
            posts = Post.objects.filter(is_active=True).filter(author_id=author_id)

        else:
            if request.user.is_authenticated:
                followed_people = Follow.objects.filter(follower=request.user).values('following')

                if(len(followed_people)):
                    posts = Post.objects.filter(is_active=True).filter(author__in=followed_people).order_by('-id')
                else:
                    posts = Post.objects.filter(is_active=True).order_by('-id')
            else:
                posts = Post.objects.filter(is_active=True).order_by('-id')
        
        post_serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(post_serializer.data)

    def post(self, request):
        post_serializer = PostSerializer(
            data=request.data, context={'request': request})

        if post_serializer.is_valid():
            post_serializer.save()
            return Response(post_serializer.data)
        else:
            return Response(post_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExploreView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        posts = Post.objects.filter(is_active=True).order_by('-id')
        post_serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(post_serializer.data)


class SinglePostView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        post = Post.objects.get(id=pk)
        post.visits += 1
        post.save()
        post_serializer = PostSerializer(post)
        return Response(post_serializer.data)

    def put(self, request, pk):
        post = Post.objects.get(id=pk)
        
        if post.author != request.user:
            return Response({"error": "You are not authorized to update this post."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PostSerializer(post, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        post = Post.objects.get(id=pk)

        if post.author != request.user:
            return Response({"error": "You are not authorized to delete this post."}, status=status.HTTP_403_FORBIDDEN)

        post.delete()
        return Response({"message": "Post deleted successfully"}, status=status.HTTP_200_OK)


class ReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)

        if post.author == request.user:
            return Response({"error": "You cannot report your own post."}, status=status.HTTP_400_BAD_REQUEST)

        if Report.objects.filter(user=request.user, post=post).exists():
            return Response({"error": "You have already reported this post."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReportSerializer(data=request.data, context={'request': request, 'post': post})
        if serializer.is_valid():
            serializer.save(user=request.user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TrendingPostView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        posts = Post.objects.filter(
            is_active=True).order_by('-visits')[:5]
        post_serializer = PostSerializer(posts, many=True)

        return Response(post_serializer.data)



class VoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id, vote_type):
            post = get_object_or_404(Post, id=post_id)
            vote, created = Vote.objects.get_or_create(user=request.user, post=post)

            current_vote_type = int(vote_type)
            
            if vote.type == current_vote_type:
                vote.delete()
                if current_vote_type == Vote.UPVOTE:
                    post.upvote_count -= 1
                else:
                    post.downvote_count -= 1
                post.save()
                return Response({'message': 'Vote removed'}, status=status.HTTP_204_NO_CONTENT)
            else:
                if current_vote_type == Vote.UPVOTE:
                    post.upvote_count += 1
                    if not created:
                        post.downvote_count -= 1
                else:
                    post.downvote_count += 1
                    if not created:
                        post.upvote_count -= 1

                vote.type = current_vote_type
                vote.save()
                post.save()

                return Response({'message': 'Vote updated'}, status=status.HTTP_200_OK)
        



class MyPostView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        posts = Post.objects.filter(author=request.user).order_by('-id')
        post_serializer = PostSerializer(posts, many=True)
        return Response(post_serializer.data)


def commentHandler(pk):
    total_comments = Comment.objects.filter(feed_id=pk).count()
    post = Post.objects.filter(id=pk).first()
    post.total_comments = total_comments
    post.save()


class CommentView(APIView):
    def get(self, request, post_id):
        comments = Comment.objects.filter(feed_id=post_id).order_by('-id')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, post_id):
        data = request.data
        serializer = CommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user, feed_id=post_id)
            commentHandler(post_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    def put(self, request, post_id, comment_id):
        comment = Comment.objects.get(id=comment_id, feed_id=post_id)
        if comment.user == request.user:
            serializer = CommentSerializer(comment, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save(id=comment_id, feed_id=post_id)
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message":"User not found"}, status=status.HTTP_400_BAD_REQUEST)


    def delete(self, request, post_id, comment_id):
        with transaction.atomic():
            comment = Comment.objects.get(id=comment_id, feed_id=post_id)
            if comment.user == request.user:
                comment.delete()
                post = Post.objects.get(id=post_id)
                post.total_comments = max(0, post.total_comments - 1)
                post.save()
                return Response({"message": "Comment deleted successfully"}, status=status.HTTP_200_OK)
        return Response({"message":"User not found"}, status=status.HTTP_400_BAD_REQUEST)