import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { deriveKeyFromPassword } from './designerKeyService';

export interface DesignerCustomer {
  id: number;
  name: string;
  phone: string;
  office: string;
  saleDate: string;
  price?: number;
  serial: string;
  maxUsers: number;
  notes?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  createdAt: string;
}

export interface DesignerActivation {
  id: number;
  customerId: number;
  fingerprint: string;
  requestCode: string;
  activationCode: string;
  maxUsers: number;
  issuedAt: string;
  notes?: string;
}

export interface DesignerIncident {
  id: number;
  customerId?: number;
  fingerprint: string;
  reason: string;
  incidentCode: string;
  unlockCode: string;
  nonce: string;
  usedCount: number;
  issuedAt: string;
}

export class DesignerCustomerDb {
  private db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS designer_customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        office TEXT NOT NULL,
        saleDate TEXT NOT NULL,
        price REAL,
        serial TEXT UNIQUE NOT NULL,
        maxUsers INTEGER DEFAULT 1,
        notes TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS designer_activations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        fingerprint TEXT NOT NULL,
        requestCode TEXT NOT NULL,
        activationCode TEXT NOT NULL,
        maxUsers INTEGER DEFAULT 1,
        issuedAt TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (customerId) REFERENCES designer_customers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS designer_incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER,
        fingerprint TEXT NOT NULL,
        reason TEXT NOT NULL,
        incidentCode TEXT NOT NULL,
        unlockCode TEXT NOT NULL,
        nonce TEXT NOT NULL UNIQUE,
        usedCount INTEGER DEFAULT 0,
        issuedAt TEXT NOT NULL
      );
    `);
  }

  // Item 2: Auto generate Serial MG-XXXX-XXXX-XXXX
  public generateSerial(): string {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `MG-${part1}-${part2}-${part3}`;
  }

  // Add customer
  public addCustomer(data: Omit<DesignerCustomer, 'id' | 'serial' | 'createdAt'> & { serial?: string }): DesignerCustomer {
    const serial = data.serial || this.generateSerial();
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO designer_customers (name, phone, office, saleDate, price, serial, maxUsers, notes, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.name.trim(),
      data.phone.trim(),
      data.office.trim(),
      data.saleDate,
      data.price ?? null,
      serial,
      data.maxUsers || 1,
      data.notes || null,
      data.status || 'ACTIVE',
      createdAt
    );

    return {
      id: Number(info.lastInsertRowid),
      name: data.name.trim(),
      phone: data.phone.trim(),
      office: data.office.trim(),
      saleDate: data.saleDate,
      price: data.price,
      serial,
      maxUsers: data.maxUsers || 1,
      notes: data.notes,
      status: data.status || 'ACTIVE',
      createdAt,
    };
  }

  // Search / List customers
  public getCustomers(query?: string): DesignerCustomer[] {
    if (!query || !query.trim()) {
      return this.db.prepare(`SELECT * FROM designer_customers ORDER BY id DESC`).all() as DesignerCustomer[];
    }
    const q = `%${query.trim()}%`;
    return this.db.prepare(`
      SELECT * FROM designer_customers 
      WHERE name LIKE ? OR phone LIKE ? OR office LIKE ? OR serial LIKE ?
      ORDER BY id DESC
    `).all(q, q, q, q) as DesignerCustomer[];
  }

  public getCustomerById(id: number): DesignerCustomer | undefined {
    return this.db.prepare(`SELECT * FROM designer_customers WHERE id = ?`).get(id) as DesignerCustomer | undefined;
  }

  public getCustomerBySerial(serial: string): DesignerCustomer | undefined {
    return this.db.prepare(`SELECT * FROM designer_customers WHERE serial = ?`).get(serial) as DesignerCustomer | undefined;
  }

  public updateCustomer(id: number, data: Partial<Omit<DesignerCustomer, 'id' | 'createdAt'>>): void {
    const existing = this.getCustomerById(id);
    if (!existing) throw new Error('العميل غير موجود.');

    this.db.prepare(`
      UPDATE designer_customers 
      SET name = ?, phone = ?, office = ?, saleDate = ?, price = ?, maxUsers = ?, notes = ?, status = ?
      WHERE id = ?
    `).run(
      data.name !== undefined ? data.name : existing.name,
      data.phone !== undefined ? data.phone : existing.phone,
      data.office !== undefined ? data.office : existing.office,
      data.saleDate !== undefined ? data.saleDate : existing.saleDate,
      data.price !== undefined ? data.price : existing.price,
      data.maxUsers !== undefined ? data.maxUsers : existing.maxUsers,
      data.notes !== undefined ? data.notes : existing.notes,
      data.status !== undefined ? data.status : existing.status,
      id
    );
  }

  // Record activation for customer
  public recordActivation(data: Omit<DesignerActivation, 'id'>): DesignerActivation {
    const stmt = this.db.prepare(`
      INSERT INTO designer_activations (customerId, fingerprint, requestCode, activationCode, maxUsers, issuedAt, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.customerId,
      data.fingerprint,
      data.requestCode,
      data.activationCode,
      data.maxUsers,
      data.issuedAt,
      data.notes || null
    );

    return { id: Number(info.lastInsertRowid), ...data };
  }

  public getActivationsByCustomer(customerId: number): DesignerActivation[] {
    return this.db.prepare(`SELECT * FROM designer_activations WHERE customerId = ? ORDER BY id DESC`).all(customerId) as DesignerActivation[];
  }

  // Record incident and unlock
  public recordIncident(data: Omit<DesignerIncident, 'id' | 'usedCount'>): DesignerIncident {
    const stmt = this.db.prepare(`
      INSERT INTO designer_incidents (customerId, fingerprint, reason, incidentCode, unlockCode, nonce, usedCount, issuedAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const info = stmt.run(
      data.customerId || null,
      data.fingerprint,
      data.reason,
      data.incidentCode,
      data.unlockCode,
      data.nonce,
      data.issuedAt
    );

    return { id: Number(info.lastInsertRowid), usedCount: 0, ...data };
  }

  public getIncidentByNonce(nonce: string): DesignerIncident | undefined {
    return this.db.prepare(`SELECT * FROM designer_incidents WHERE nonce = ?`).get(nonce) as DesignerIncident | undefined;
  }

  public incrementIncidentUsedCount(nonce: string): void {
    this.db.prepare(`UPDATE designer_incidents SET usedCount = usedCount + 1 WHERE nonce = ?`).run(nonce);
  }

  public getIncidentsByCustomer(customerId: number): DesignerIncident[] {
    return this.db.prepare(`SELECT * FROM designer_incidents WHERE customerId = ? ORDER BY id DESC`).all(customerId) as DesignerIncident[];
  }

  // Item 5: Export encrypted backup of entire database
  public async exportEncryptedBackup(password: string, targetFilePath: string): Promise<void> {
    if (!password || password.length < 6) {
      throw new Error('كلمة سر التصدير يجب أن لا تقل عن 6 أحرف.');
    }

    const customers = this.db.prepare(`SELECT * FROM designer_customers`).all();
    const activations = this.db.prepare(`SELECT * FROM designer_activations`).all();
    const incidents = this.db.prepare(`SELECT * FROM designer_incidents`).all();

    const backupPayload = { version: 1, exportedAt: new Date().toISOString(), customers, activations, incidents };
    const jsonStr = JSON.stringify(backupPayload);

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = await deriveKeyFromPassword(password, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const fileContent = {
      format: 'MG_DESIGNER_BACKUP_V1',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted.toString('hex'),
    };

    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.writeFileSync(targetFilePath, JSON.stringify(fileContent, null, 2), 'utf8');
  }

  // Item 5: Import encrypted backup
  public async importEncryptedBackup(password: string, sourceFilePath: string): Promise<{ importedCustomers: number }> {
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error('ملف النسخة الاحتياطية غير موجود.');
    }

    const fileContent = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
    if (fileContent.format !== 'MG_DESIGNER_BACKUP_V1') {
      throw new Error('صيغة ملف النسخة الاحتياطية غير مدعومة.');
    }

    const salt = Buffer.from(fileContent.salt, 'hex');
    const iv = Buffer.from(fileContent.iv, 'hex');
    const authTag = Buffer.from(fileContent.authTag, 'hex');
    const encrypted = Buffer.from(fileContent.data, 'hex');

    const key = await deriveKeyFromPassword(password, salt);

    let decryptedStr = '';
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      decryptedStr = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      throw new Error('كلمة السر غير صحيحة! تعذر فك تشفير النسخة الاحتياطية.');
    }

    const payload = JSON.parse(decryptedStr);
    const { customers, activations, incidents } = payload;

    const transaction = this.db.transaction(() => {
      for (const c of customers || []) {
        this.db.prepare(`
          INSERT INTO designer_customers (id, name, phone, office, saleDate, price, serial, maxUsers, notes, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, phone=excluded.phone, office=excluded.office, saleDate=excluded.saleDate,
            price=excluded.price, serial=excluded.serial, maxUsers=excluded.maxUsers, notes=excluded.notes,
            status=excluded.status
        `).run(c.id, c.name, c.phone, c.office, c.saleDate, c.price, c.serial, c.maxUsers, c.notes, c.status, c.createdAt);
      }

      for (const a of activations || []) {
        this.db.prepare(`
          INSERT INTO designer_activations (id, customerId, fingerprint, requestCode, activationCode, maxUsers, issuedAt, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            customerId=excluded.customerId, fingerprint=excluded.fingerprint, requestCode=excluded.requestCode,
            activationCode=excluded.activationCode, maxUsers=excluded.maxUsers, issuedAt=excluded.issuedAt, notes=excluded.notes
        `).run(a.id, a.customerId, a.fingerprint, a.requestCode, a.activationCode, a.maxUsers, a.issuedAt, a.notes);
      }

      for (const inc of incidents || []) {
        this.db.prepare(`
          INSERT INTO designer_incidents (id, customerId, fingerprint, reason, incidentCode, unlockCode, nonce, usedCount, issuedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            customerId=excluded.customerId, fingerprint=excluded.fingerprint, reason=excluded.reason,
            incidentCode=excluded.incidentCode, unlockCode=excluded.unlockCode, nonce=excluded.nonce,
            usedCount=excluded.usedCount, issuedAt=excluded.issuedAt
        `).run(inc.id, inc.customerId, inc.fingerprint, inc.reason, inc.incidentCode, inc.unlockCode, inc.nonce, inc.usedCount || 0, inc.issuedAt);
      }
    });

    transaction();
    return { importedCustomers: customers ? customers.length : 0 };
  }

  public close() {
    this.db.close();
  }
}
