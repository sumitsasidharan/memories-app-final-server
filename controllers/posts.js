import express from 'express';
import mongoose from 'mongoose';

import PostMessage from '../models/postMessage.js';

const router = express.Router();

// get posts takes page query from frontend
export const getPosts = async (req, res) => {
   const { page } = req.query;

   try {
      const LIMIT = 8;
      // get the starting index of particular page, ie 4th page will have
      // a startIndex of 25, with a limit of 8 (8 x 3 + 1)
      const startIndex = (Number(page) - 1) * LIMIT;
      const total = await PostMessage.countDocuments({});

      const posts = await PostMessage.find()
         .sort({ _id: -1 })
         .limit(LIMIT)
         .skip(startIndex);

      res.status(200).json({
         data: posts,
         currentPage: Number(page),
         numberOfPages: Math.ceil(total / LIMIT),
      });
   } catch (error) {
      res.status(404).json({ message: error.message });
   }
};

export const getPostsBySearch = async (req, res) => {
   const { searchQuery, tags } = req.query;

   try {
      // convert to regular expression
      const title = new RegExp(searchQuery, 'i');

      const posts = await PostMessage.find({
         $or: [{ title }, { tags: { $in: tags.split(',') } }],
      });

      res.status(200).json({ data: posts });
   } catch (error) {
      res.status(404).json({ message: error.message });
   }
};

export const getPost = async (req, res) => {
   const { id } = req.params;

   try {
      const post = await PostMessage.findById(id);

      res.status(200).json(post);
   } catch (error) {
      res.status(404).json({ message: error.message });
   }
};

export const createPost = async (req, res) => {
   const post = req.body;

   const newPostMessage = new PostMessage({
      ...post,
      creator: req.userId,
      createdAt: new Date().toISOString(),
   });

   try {
      await newPostMessage.save();

      res.status(201).json(newPostMessage);
   } catch (error) {
      res.status(409).json({ message: error.message });
   }
};

export const updatePost = async (req, res) => {
   const { id } = req.params;
   const { title, message, creator, selectedFile, tags } = req.body;

   if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(404).send(`No post with id: ${id}`);

   const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

   await PostMessage.findByIdAndUpdate(id, updatedPost, { new: true });

   res.json(updatedPost);
};

export const deletePost = async (req, res) => {
   const { id } = req.params;

   if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(404).send(`No post with id: ${id}`);

   await PostMessage.findByIdAndRemove(id);

   res.json({ message: 'Post deleted successfully.' });
};

export const likePost = async (req, res) => {
   const { id } = req.params;

   if (!req.userId) {
      return res.json({ message: 'Unauthenticated' });
   }

   if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(404).send(`No post with id: ${id}`);

   const post = await PostMessage.findById(id);

   const index = post.likes.findIndex((id) => id === String(req.userId));

   if (index === -1) {
      post.likes.push(req.userId);
   } else {
      post.likes = post.likes.filter((id) => id !== String(req.userId));
   }
   const updatedPost = await PostMessage.findByIdAndUpdate(id, post, {
      new: true,
   });
   res.status(200).json(updatedPost);
};

// Comments
export const commentPost = async (req, res) => {
   const { id } = req.params;
   const { value } = req.body;

   try {
      // find post where comment is posted
      const post = await PostMessage.findById(id);

      // updating Array in the current memory
      post.comments.push(value);

      // updating Post in the database
      const updatedPost = await PostMessage.findByIdAndUpdate(id, post, {
         new: true,
      });

      res.json(updatedPost);
   } catch (error) {
      res.json(error.message);
   }
};

export default router;
