/**
 * Fixed Interactions Service for Comments and Reactions
 * @file interactions.ts - Fixed version
 */

import { post, put, del } from '../api/client';
import { error as logError } from '../../utils/log';

export interface Comment {
  id: string;
  body: string;
  replyToId?: string | null;
  postId: string;
  owner: string;
  created: string;
  updated: string;
  author: {
    name: string;
    email: string;
    avatar?: {
      url: string;
      alt: string;
    } | null;
  };
}

export interface Reaction {
  symbol: string;
  count: number;
  reactors?: Array<{
    name: string;
    email: string;
  }>;
}

export interface CommentsResponse {
  data: Comment[];
  meta: {
    isFirstPage: boolean;
    isLastPage: boolean;
    currentPage: number;
    previousPage: number | null;
    nextPage: number | null;
    pageCount: number;
    totalCount: number;
  };
}

export interface CreateCommentResponse {
  data: Comment;
}


/**
 * Create a new comment on a post
 * @param postId The ID of the post to comment on
 * @param body The comment text
 * @param replyToId Optional ID of comment to reply to
 * @returns Promise with created comment
 */
export async function createComment(
  postId: string,
  body: string,
  replyToId?: string
): Promise<CreateCommentResponse> {
  const commentData: any = { body };

  if (replyToId) {
    commentData.replyToId = parseInt(replyToId);
  }

  try {
    const response = await post(`/social/posts/${postId}/comment`, commentData);

    // Handle the response according to the API docs
    if (response?.data) {
      return { data: response.data };
    } else if (response?.id) {
      return { data: response };
    } else {
      throw new Error('Invalid response format from comment creation');
    }
  } catch (err: any) {
    logError('Error creating comment:', err);
    throw new Error(
      err?.message || 'Failed to create comment. Please try again.'
    );
  }
}

/**
 * Delete a comment (only works for your own comments)
 * @param postId The ID of the post
 * @param commentId The ID of the comment to delete
 * @returns Promise that resolves when comment is deleted
 */
export async function deleteComment(
  postId: string,
  commentId: string
): Promise<void> {
  try {
    await del(`/social/posts/${postId}/comment/${commentId}`);
  } catch (err: any) {
    logError('Error deleting comment:', err);

    if (err?.message?.toLowerCase().includes('unauthorized')) {
      throw new Error('You can only delete your own comments.');
    } else if (err?.message?.toLowerCase().includes('not found')) {
      throw new Error('The comment you are trying to delete was not found.');
    } else {
      throw new Error(
        err?.message || 'Failed to delete comment. Please try again.'
      );
    }
  }
}

/**
 * React to a post with an emoji (internal helper for toggleReaction)
 */
async function reactToPost(
  postId: string,
  symbol: string
): Promise<void> {
  try {
    await put(
      `/social/posts/${postId}/react/${encodeURIComponent(symbol)}`,
      {}
    );
  } catch (err: any) {
    logError('Error reacting to post:', err);

    if (err?.message?.toLowerCase().includes('unauthorized')) {
      throw new Error('You must be logged in to react to posts.');
    } else if (err?.message?.toLowerCase().includes('not found')) {
      throw new Error('The post you are trying to react to was not found.');
    } else {
      throw new Error(
        err?.message || 'Failed to react to post. Please try again.'
      );
    }
  }
}

/**
 * Remove reaction from a post (internal helper for toggleReaction)
 */
async function removeReaction(
  postId: string,
  symbol: string
): Promise<void> {
  try {
    await del(`/social/posts/${postId}/react/${encodeURIComponent(symbol)}`);
  } catch (err: any) {
    logError('Error removing reaction:', err);

    if (err?.message?.toLowerCase().includes('unauthorized')) {
      throw new Error('You must be logged in to remove reactions.');
    } else if (err?.message?.toLowerCase().includes('not found')) {
      throw new Error('The reaction you are trying to remove was not found.');
    } else {
      throw new Error(
        err?.message || 'Failed to remove reaction. Please try again.'
      );
    }
  }
}

/**
 * Toggle reaction on a post (add if not exists, remove if exists)
 * @param postId The ID of the post
 * @param symbol The emoji symbol to toggle
 * @returns Promise that resolves to true if reaction was added, false if removed
 */
export async function toggleReaction(
  postId: string,
  symbol: string
): Promise<boolean> {
  try {
    // Try to add the reaction first
    await reactToPost(postId, symbol);
    return true; // Successfully added
  } catch (err: any) {
    // If the reaction already exists, try to remove it
    if (
      err.message?.includes('already') ||
      err.message?.includes('exist') ||
      err.statusCode === 400 ||
      err.statusCode === 409
    ) {
      try {
        await removeReaction(postId, symbol);
        return false; // Successfully removed
      } catch (removeError: any) {
        logError('Error removing existing reaction:', removeError);
        throw removeError;
      }
    }

    // If it's a different error, re-throw it
    throw err;
  }
}
