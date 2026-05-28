// @ts-nocheck
import express from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from './auth';

const router = express.Router();

// Admin authentication middleware - check if user is admin
function requireAdmin(req: any, res: any, next: any) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

/**
 * GET /export/players
 * Exports all players and joins with their latest payment to get parent info.
 * Returns a CSV file directly.
 * Requires admin authentication.
 */
router.get('/players', requireAdmin, async (req, res) => {
    try {
        // Fetch players and join with their payments
        const playersData = await db.select({
            id: schema.players.id,
            name: schema.players.name,
            position: schema.players.position,
            age: schema.players.age,
            state: schema.players.state,
            createdAt: schema.players.createdAt,
            // Grab parent info from payments table
            parentName: schema.payments.parentName,
            parentEmail: schema.payments.parentEmail,
            parentPhone: schema.payments.parentPhone,
        })
            .from(schema.players)
            .leftJoin(schema.payments, eq(schema.players.id, schema.payments.playerId))
            .orderBy(desc(schema.players.createdAt));

        // Deduplicate: If a player has multiple payments, we might get multiple rows.
        // We'll keep the first one we see (which is fine for contact info extraction).
        const uniquePlayers = new Map();
        for (const row of playersData) {
            if (!uniquePlayers.has(row.id)) {
                uniquePlayers.set(row.id, row);
            } else if (!uniquePlayers.get(row.id).parentEmail && row.parentEmail) {
                // Keep the row with parent email if we found one
                uniquePlayers.set(row.id, row);
            }
        }

        const deduplicated = Array.from(uniquePlayers.values());

        // Construct CSV
        const headers = [
            'ID',
            'Name',
            'Position',
            'Age',
            'State',
            'Parent Name',
            'Parent Email',
            'Parent Phone',
            'Created At'
        ];

        const csvRows = [headers.join(',')];

        for (const player of deduplicated) {
            const row = [
                player.id,
                `"${player.name || ''}"`,
                `"${player.position || ''}"`,
                player.age || '',
                `"${player.state || ''}"`,
                `"${player.parentName || ''}"`,
                `"${player.parentEmail || ''}"`,
                `"${player.parentPhone || ''}"`,
                player.createdAt ? new Date(player.createdAt).toISOString() : ''
            ];
            csvRows.push(row.join(','));
        }

        const csvString = csvRows.join('\n');

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="hers365_players_export.csv"');

        res.status(200).send(csvString);
    } catch (err: any) {
        console.error('Export Error:', err);
        res.status(500).json({ error: 'Failed to generate CSV export' });
    }
});

export default router;
