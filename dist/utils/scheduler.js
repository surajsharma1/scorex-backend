"use strict";
/**
 * ScoreX Scheduler
 * Runs lightweight background jobs without any external cron library.
 * Uses setInterval so it works on Render.com free tier.
 *
 * Jobs:
 * 1. Auto-delete expired tournaments 3 days after their endDate
 * 2. Enforce 10MB per-user storage cap on Match documents
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const mongoose_1 = __importDefault(require("mongoose"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
const Team_1 = __importDefault(require("../models/Team"));
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const TEN_MB = 10 * 1024 * 1024; // 10 MB in bytes
// ── Job 1: Delete expired tournaments ─────────────────────────────────────────
async function deleteExpiredTournaments() {
    try {
        const cutoff = new Date(Date.now() - THREE_DAYS_MS);
        // Find tournaments whose endDate passed 3+ days ago and are completed
        const expired = await Tournament_1.default.find({
            endDate: { $lt: cutoff },
            status: { $in: ['completed', 'ongoing'] },
        }).select('_id name endDate');
        if (expired.length === 0)
            return;
        console.log(`[Scheduler] Found ${expired.length} expired tournament(s) to delete`);
        for (const t of expired) {
            await Match_1.default.deleteMany({ tournamentId: t._id });
            await Team_1.default.deleteMany({ tournament: t._id });
            await Tournament_1.default.findByIdAndDelete(t._id);
            console.log(`[Scheduler] Deleted tournament: ${t.name} (ended ${t.endDate?.toISOString()})`);
        }
    }
    catch (err) {
        console.error('[Scheduler] deleteExpiredTournaments error:', err);
    }
}
// ── Job 2: Enforce 10MB per-user match storage cap ────────────────────────────
// Estimates match document size via JSON serialisation and deletes oldest
// completed matches if a user's total exceeds 10 MB.
async function enforceUserStorageCap() {
    try {
        // Aggregate match storage per creator (via scorerId or tournament organizer)
        // We use a simple approach: group by the tournament organizer
        const tournaments = await Tournament_1.default.find({}).select('_id organizer').lean();
        const byOrganizer = {};
        for (const t of tournaments) {
            const uid = t.organizer?.toString();
            if (!uid)
                continue;
            if (!byOrganizer[uid])
                byOrganizer[uid] = [];
            byOrganizer[uid].push(t._id.toString());
        }
        for (const [organizerId, tournamentIds] of Object.entries(byOrganizer)) {
            const matches = await Match_1.default.find({
                tournamentId: { $in: tournamentIds.map(id => new mongoose_1.default.Types.ObjectId(id)) },
                status: 'completed',
            }).sort({ createdAt: 1 }); // oldest first for deletion
            let totalBytes = 0;
            const toDelete = [];
            for (const m of matches) {
                const size = Buffer.byteLength(JSON.stringify(m.toObject()), 'utf8');
                totalBytes += size;
                if (totalBytes > TEN_MB) {
                    toDelete.push(m._id);
                }
            }
            if (toDelete.length > 0) {
                await Match_1.default.deleteMany({ _id: { $in: toDelete } });
                console.log(`[Scheduler] Storage cap: removed ${toDelete.length} old match(es) for organizer ${organizerId} (was ${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
            }
        }
    }
    catch (err) {
        console.error('[Scheduler] enforceUserStorageCap error:', err);
    }
}
// ── Start scheduler ────────────────────────────────────────────────────────────
function startScheduler() {
    console.log('[Scheduler] Starting background jobs...');
    // Run immediately on startup, then every 6 hours
    deleteExpiredTournaments();
    enforceUserStorageCap();
    setInterval(deleteExpiredTournaments, 6 * 60 * 60 * 1000); // every 6h
    setInterval(enforceUserStorageCap, 6 * 60 * 60 * 1000); // every 6h
    console.log('[Scheduler] Jobs registered (runs every 6h)');
}
