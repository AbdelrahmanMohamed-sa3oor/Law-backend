// routes/opponentRoutes.js
import express from 'express';
import {
  getOpponents,
  getOpponent,
  createOpponent,
  updateOpponent,
  deleteOpponent,
  searchOpponents
} from '../controllers/opponentController.js';

const router = express.Router();
router.get('/', getOpponents);
router.get('/search', searchOpponents);
router.get('/:id', getOpponent);
router.post('/', createOpponent);
router.put('/:id', updateOpponent);
router.delete('/:id', deleteOpponent);
export default router;