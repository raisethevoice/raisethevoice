from rest_framework import serializers
from feed.models import Post, Vote, Comment
from account.serializers import UserSerializer


class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(required=False)
    is_upvoted = serializers.SerializerMethodField()
    is_downvoted = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = "__all__"

    def get_is_upvoted(self, obj):
        user = self.context['request'].user

        if(user):
            return Vote.objects.filter(user=user, post=obj, type=Vote.UPVOTE).exists()

    def get_is_downvoted(self, obj):
        user = self.context['request'].user

        if(user):
            return Vote.objects.filter(user=user, post=obj, type=Vote.DOWNVOTE).exists()

    def create(self, validated_data):
        title = validated_data.pop("title")
        content = validated_data.pop("content")
        tag = validated_data.pop("tag")
        post = Post.objects.create(
            title=title, content=content, tag=tag, author=self.context['request'].user)
        return post


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = "__all__"
        depth = 1


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = "__all__"
        depth = 1
