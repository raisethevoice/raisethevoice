import { Skeleton, Dropdown } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { CiEdit } from 'react-icons/ci';
import { IoSend } from 'react-icons/io5';
import { MdDeleteOutline, MdOutlineReport } from 'react-icons/md';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import {
  useGetCommentsQuery,
  useSubmitCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from 'store/api/feed';
import { requireAuth } from 'store/prompt';
import { CommentT, PostT } from 'types/feed';
import { cn, getUserAvatar, getUserFullName } from 'utils';

type CommentBoxProps = {
  className?: string;
  post: PostT;
  updateTotalComment: (change: number) => void;
};

export default function CommentBox({ className, post, updateTotalComment }: CommentBoxProps,) {
  const [comments, setComments] = useState<CommentT[]>();
  const [newCommentValue, setNewCommentValue] = useState('');
  const [editingComment, setEditingComment] = useState<{
    id: number;
    content: string;
  } | null>(null);
  const newCommentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editCommentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const { data, refetch: refetchComments } = useGetCommentsQuery(post.id);
  const [submitComment] = useSubmitCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const dispatch = useDispatch();

  useEffect(() => {
    setComments(data);
  }, [data]);

  const handleNewCommentChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNewCommentValue(e.target.value);
    adjustTextareaHeight(e.target);
  };

  const handleEditCommentChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setEditingComment((prev) =>
      prev ? { ...prev, content: e.target.value } : null
    );
    adjustTextareaHeight(e.target);
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSubmitNewComment = async () => {
    if (!user) {
      dispatch(requireAuth());
    } else if (newCommentValue) {
      await submitComment({ postId: post.id, content: newCommentValue });
      updateTotalComment(+1);
      refetchComments();
      setNewCommentValue('');
    }
  };

  const handleSubmitEditComment = async () => {
    if (editingComment) {
      await updateComment({
        postId: post.id,
        commentId: editingComment.id,
        content: editingComment.content,
      });
      refetchComments();
      setEditingComment(null);
    }
  };

  const handleCommentActions = async (key: string, comment: CommentT) => {
    if (!user) {
      dispatch(requireAuth());
      return;
    }
    if (key === 'edit_comment') {
      setEditingComment({ id: comment.id, content: comment.content });
      setTimeout(() => {
        if (editCommentTextareaRef.current) {
          editCommentTextareaRef.current.focus();
          // Move the cursor at the end of the content
          editCommentTextareaRef.current.setSelectionRange(
            editCommentTextareaRef.current.value.length,
            editCommentTextareaRef.current.value.length
          );
          adjustTextareaHeight(editCommentTextareaRef.current);
        }
      }, 0);
    } else if (key === 'delete_comment') {
      await deleteComment({ postId: post.id, commentId: comment.id });
      updateTotalComment(-1);
      refetchComments();
    }
  };

  return (
    <div className="border-t mt-4">
      <div className="mt-4">
        {comments ? (
          comments?.length ? (
            <div className="flex flex-col gap-3 max-h-[120px] overflow-y-auto">
              {comments?.map((comment) => (
                <div key={comment.id} className="w-full flex gap-3">
                  <img
                    src={getUserAvatar(comment.user.profile)}
                    alt="default avatar"
                    className="w-8 h-8 rounded-full"
                  />

                  <div className="bg-gray-100 px-2.5 py-1.5 rounded-lg">
                    <div className="flex justify-between">
                      <h6 className="font-medium">
                        {getUserFullName(comment.user)}
                      </h6>
                      <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        overlayStyle={{ paddingTop: 10, width: 160 }}
                        menu={{
                          items: [
                            ...(user?.id === comment?.user?.id
                              ? [
                                {
                                  label: 'Edit Comment',
                                  key: 'edit_comment',
                                  icon: <CiEdit size={15} />,
                                },
                                {
                                  label: 'Delete Comment',
                                  key: 'delete_comment',
                                  icon: <MdDeleteOutline size={15} />,
                                },
                              ]
                              : []),
                            {
                              label: <span>Report Comment</span>,
                              key: 'report_comment',
                              icon: <MdOutlineReport size={15} />,
                              danger: true,
                            },
                          ],
                          onClick: ({ key }) =>
                            handleCommentActions(key, comment),
                        }}
                      >
                        <button className="hover:bg-gray-200 p-1 rounded-md duration-300 ease-in-out focus:bg-gray-200">
                          <BsThreeDotsVertical className="text-xs text-neutral-500" />
                        </button>
                      </Dropdown>
                    </div>
                    {editingComment?.id === comment.id ? (
                      <div className="w-full relative mt-2">
                        <textarea
                          ref={editCommentTextareaRef}
                          value={editingComment.content}
                          onChange={handleEditCommentChange}
                          className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-200 focus:border-gray-300"
                          placeholder="Edit comment"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitEditComment();
                            }
                          }}
                        />
                        <IoSend
                          className="absolute bottom-[12px] right-2 -rotate-45 text-[17px] text-gray-400 cursor-pointer"
                          onClick={handleSubmitEditComment}
                        />
                      </div>
                    ) : (
                      <p>{comment.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null
        ) : post.total_comments > 0 ? (
          <Skeleton title={false} paragraph={{ rows: 2 }} />
        ) : null}
      </div>

      <div className={cn('w-full flex gap-3 mt-4', className)}>
        <img
          src={getUserAvatar(user?.profile)}
          alt="default avatar"
          className="w-8 h-8 rounded-full"
        />

        <div className="w-full relative">
          <textarea
            ref={newCommentTextareaRef}
            value={newCommentValue}
            onChange={handleNewCommentChange}
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-200 focus:border-gray-300"
            placeholder={`Comment as ${getUserFullName(user)}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitNewComment();
              }
            }}
          />
          <IoSend
            className="absolute bottom-[12px] right-2 -rotate-45 text-[17px] text-gray-400 cursor-pointer"
            onClick={handleSubmitNewComment}
          />
        </div>
      </div>
    </div>
  );
}
