import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import _ from 'lodash';
import { FaRegCommentAlt } from 'react-icons/fa';
import { PiShareFat } from 'react-icons/pi';
import { Link } from 'react-router-dom';
import { PostT } from 'types/feed';
import { createMarkup } from 'utils/misc';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { handlePostModal, requireAuth } from 'store/prompt';
import { Dropdown, Modal } from 'antd';
import { CiEdit } from 'react-icons/ci';
import { MdOutlineReport, MdDeleteOutline } from 'react-icons/md';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Button } from 'lib';
import Vote from 'components/PostSingle/Vote';
import CommentBox from 'components/PostSingle/CommentBox';
import ShareModal from 'components/PostSingle/ShareModal';
import { getUserAvatar } from 'utils';

dayjs.extend(relativeTime);

type PostSingleProps = {
  post: PostT;
};

type ActionBarProps = {
  post: PostT;
  totalComments: number;
  updateTotalComment: (change: number) => void;
};

export default function PostSingle(props: PostSingleProps) {
  const { id, title, content } = props.post;
  const [totalComments, setTotalComments] = useState(props.post.total_comments);

  const updateTotalComment = (change: number) => {
    setTotalComments(prev => prev + change);
  };

  return (
    <div className="w-full rounded-xl border p-4 shadow-sm bg-white">
      <PostHeader {...props} />

      <Link to={`/post/${id}`} className="mt-3 inline-block">
        {title ? (
          <div className="mb-1.5 text-xl font-medium">{title}</div>
        ) : null}

        <div className="text-sm text-neutral-600">
          <div
            dangerouslySetInnerHTML={createMarkup(
              _.truncate(content, { length: 300 })
            )}
          />
        </div>
      </Link>

      <ActionBar {...props} totalComments={totalComments}
        updateTotalComment={updateTotalComment} />
    </div>
  );
}

const PostHeader = ({ post }: PostSingleProps) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { author, created_at } = post;
  const dispatch = useDispatch();

  const handlePostActions = (key: string) => {
    if (!user) {
      dispatch(requireAuth());
      return;
    }

    if (key === 'edit_post') {
      dispatch(handlePostModal({ open: true, postData: post }));
    } else if (key === 'delete_post') {
      Modal.confirm({
        title: 'Do you want to delete this post?',
        icon: <ExclamationCircleFilled />,
        content: 'This action cannot be undone.',
        onOk() { },
        onCancel() { },
        centered: true,
        footer: () => (
          <div className="flex justify-end gap-3">
            <Button
              className="bg-white border hover:bg-black text-black hover:text-white duration-500 ease-in-out px-3 py-1"
              onClick={() => Modal.destroyAll()}
            >
              Cancel
            </Button>
            <Button onClick={() => { }}>Yes, Delete</Button>
          </div>
        ),
      });
    }
  };

  return (
    <div className="flex w-full items-center justify-between">
      <Link to={`/profile/${author.id}`} className="flex items-center gap-3">
        <img
          src={getUserAvatar(author.profile)}
          className="h-8 w-8 rounded-full object-cover"
        />
        <div className="text-lg font-semibold text-slate-700">
          {author.first_name + ' ' + author.last_name}
        </div>
      </Link>
      <div className="flex items-center space-x-2">
        <div className="text-xs text-neutral-500">
          {created_at
            ? dayjs(`${new Date(created_at).toUTCString()}`).fromNow(true)
            : null}{' '}
          ago
        </div>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          overlayStyle={{ paddingTop: 10, width: 150 }}
          menu={{
            items: [
              ...(user?.id === author?.id
                ? [
                  {
                    label: 'Edit Post',
                    key: 'edit_post',
                    icon: <CiEdit size={15} />,
                  },
                  {
                    label: 'Delete Post',
                    key: 'delete_post',
                    icon: <MdDeleteOutline size={15} />,
                  },
                ]
                : []),
              {
                label: <span>Report Post</span>,
                key: 'report_post',
                icon: <MdOutlineReport size={15} />,
                danger: true,
              },
            ],
            onClick: (event) => handlePostActions(event.key),
          }}
        >
          <button className="hover:bg-gray-200 p-1 rounded-md duration-300 ease-in-out focus:bg-gray-200">
            <BsThreeDotsVertical className="text-xs text-neutral-500" />
          </button>
        </Dropdown>
      </div>
    </div>
  );
};

const ActionBar = ({ post, totalComments, updateTotalComment }: ActionBarProps) => {
  const [isCommentBoxOpen, setIsCommentBoxOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { id, share_count } = post;

  const onCommentClick = () => {
    if (user) {
      setIsCommentBoxOpen(true);
    } else {
      dispatch(requireAuth());
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mt-3">
        <Vote {...post} />
        <div
          className="bg-gray-100 hover:bg-gray-200 cursor-pointer h-8 px-2.5 rounded-full flex gap-1.5 items-center justify-center"
          onClick={onCommentClick}
        >
          <FaRegCommentAlt className="text-[15px] translate-y-[1px]" />
          <p>{totalComments ?? 0}</p>
        </div>
        <div
          className="bg-gray-100 hover:bg-gray-200 cursor-pointer h-8 px-2.5 rounded-full flex gap-1.5 items-center justify-center"
          onClick={() => setIsShareModalOpen(true)}
        >
          <PiShareFat className="text-[19px]" />
          {share_count ?? 0}
        </div>
      </div>

      {isCommentBoxOpen ? <CommentBox post={post} updateTotalComment={updateTotalComment} /> : null}
      <ShareModal
        open={isShareModalOpen}
        onCancel={() => setIsShareModalOpen(false)}
        url={window.location.href + `post/${id}`}
      />
    </div>
  );
};
