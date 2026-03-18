import { Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';
import path from 'path';
import fs from 'fs/promises';

export class DataExportService {
  static async exportUsers(res: Response, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      const users = await User.find({ deleted: { $ne: true } })
        .select('-password -__v')
        .lean();

      if (format === 'csv') {
        const csvData = this.convertToCSV(users, ['_id', 'username', 'email', 'role', 'createdAt']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="users.json"');
        res.json(users);
      }
    } catch (error) {
      res.status(500).json({ message: 'Export failed' });
    }
  }

  static async exportTournaments(res: Response, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      const tournaments = await Tournament.find({ deleted: { $ne: true } })
        .populate('createdBy', 'username')
        .lean();

      if (format === 'csv') {
        const csvData = this.convertToCSV(tournaments, ['_id', 'name', 'status', 'startDate', 'registrationFee']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tournaments.csv"');
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="tournaments.json"');
        res.json(tournaments);
      }
    } catch (error) {
      res.status(500).json({ message: 'Export failed' });
    }
  }

  static async exportTeams(res: Response, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      const teams = await Team.find({ deleted: { $ne: true } })
        .populate('tournament', 'name')
        .populate('players', 'name')
        .lean();

      if (format === 'csv') {
        const csvData = this.convertToCSV(teams, ['_id', 'name', 'tournament', 'players']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="teams.csv"');
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="teams.json"');
        res.json(teams);
      }
    } catch (error) {
      res.status(500).json({ message: 'Export failed' });
    }
  }

  static async exportPayments(res: Response, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      const payments = await User.aggregate([
        { $unwind: { path: '$paymentHistory', preserveNullAndEmptyArrays: true } },
        { $match: { 'paymentHistory.status': 'completed' } },
        { $project: {
          username: '$username',
          email: '$email',
          amount: '$paymentHistory.amount',
          currency: '$paymentHistory.currency',
          level: '$paymentHistory.level',
          date: '$paymentHistory.date',
          status: '$paymentHistory.status'
        } }
      ]);

      if (format === 'csv') {
        const csvData = this.convertToCSV(payments, ['username', 'email', 'amount', 'currency', 'level', 'date', 'status']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
        res.send(csvData);
      } else {
        res.json(payments);
      }
    } catch (error) {
      res.status(500).json({ message: 'Export failed' });
    }
  }

  private static convertToCSV(data: any[], fields: string[]): string {
    if (data.length === 0) return '';

    const headers = fields.join(',');
    const rows = data.map(item =>
      fields.map(field => {
        const value = this.getNestedValue(item, field);
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    );

    return [headers, ...rows].join('\\n');
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

