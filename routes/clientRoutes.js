// routes/clientRoutes.js
import express from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  searchClients
} from '../controllers/clientController.js';

const router = express.Router();

router.get('/', getClients);
router.get('/search', searchClients);
router.get('/:id', getClient);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;