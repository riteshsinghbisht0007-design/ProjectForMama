import bcrypt from 'bcryptjs';

export class InMemoryCollection {
  public items: any[] = [];

  constructor(initialData: any[] = []) {
    this.items = [...initialData];
  }

  async createIndex(_keys: any, _options?: any) {
    return 'ok';
  }

  public matchesQuery(item: any, query: any): boolean {
    if (!query || Object.keys(query).length === 0) return true;
    for (const key of Object.keys(query)) {
      if (key === '$or') {
        const orConditions: any[] = query['$or'];
        if (!orConditions.some((cond) => this.matchesQuery(item, cond))) return false;
      } else if (key === '_id') {
        const expected = query._id?.toString?.() ?? String(query._id);
        const actual = item._id?.toString?.() ?? String(item._id);
        if (expected !== actual) return false;
      } else if (typeof query[key] === 'object' && query[key] !== null) {
        if ('$ne' in query[key]) {
          if (item[key] === query[key].$ne) return false;
        }
      } else {
        if (item[key] !== query[key]) return false;
      }
    }
    return true;
  }

  async findOne(query: any) {
    const found = this.items.find((item) => this.matchesQuery(item, query));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  find(query: any) {
    const matched = this.items.filter((item) => this.matchesQuery(item, query));
    let result = JSON.parse(JSON.stringify(matched));
    return {
      sort: (sortObj: any) => {
        const keys = Object.keys(sortObj);
        if (keys.length > 0) {
          const sortKey = keys[0];
          const dir = sortObj[sortKey]; // 1 for asc, -1 for desc
          result.sort((a: any, b: any) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA < valB) return dir === -1 ? 1 : -1;
            if (valA > valB) return dir === -1 ? -1 : 1;
            return 0;
          });
        }
        return {
          toArray: async () => result,
        };
      },
      toArray: async () => result,
    };
  }

  async insertOne(doc: any) {
    const item = { ...doc };
    if (!item._id) {
      item._id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    this.items.push(item);
    return { insertedId: item._id };
  }

  async insertMany(docs: any[]) {
    const insertedIds: any[] = [];
    for (const doc of docs) {
      const res = await this.insertOne(doc);
      insertedIds.push(res.insertedId);
    }
    return { insertedIds, insertedCount: docs.length };
  }

  async updateOne(filter: any, update: any, options?: any) {
    const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
    if (index === -1) {
      if (options?.upsert) {
        const newDoc: any = {};
        if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
        if (update.$set) Object.assign(newDoc, update.$set);
        if (!newDoc._id) {
          newDoc._id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        }
        this.items.push(newDoc);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: newDoc._id };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }
    if (update.$set) {
      this.items[index] = { ...this.items[index], ...update.$set };
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter: any, update: any) {
    let modifiedCount = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.matchesQuery(this.items[i], filter)) {
        if (update.$set) {
          this.items[i] = { ...this.items[i], ...update.$set };
        }
        modifiedCount++;
      }
    }
    return { matchedCount: modifiedCount, modifiedCount };
  }

  async deleteOne(filter: any) {
    const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
    if (index !== -1) {
      this.items.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: any) {
    const initialLen = this.items.length;
    this.items = this.items.filter((item) => !this.matchesQuery(item, filter));
    return { deletedCount: initialLen - this.items.length };
  }

  async findOneAndUpdate(filter: any, update: any, options?: any) {
    const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
    if (index === -1) return null;
    const original = JSON.parse(JSON.stringify(this.items[index]));
    if (update.$set) {
      this.items[index] = { ...this.items[index], ...update.$set };
    }
    return options?.returnDocument === 'after'
      ? JSON.parse(JSON.stringify(this.items[index]))
      : original;
  }

  async bulkWrite(ops: any[], _options?: any) {
    for (const op of ops) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        const index = this.items.findIndex((item) => this.matchesQuery(item, filter));
        if (index !== -1) {
          if (update.$set) {
            this.items[index] = { ...this.items[index], ...update.$set };
          }
        } else if (upsert) {
          const newDoc: any = {};
          if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
          if (update.$set) Object.assign(newDoc, update.$set);
          if (!newDoc._id) {
            newDoc._id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
          }
          this.items.push(newDoc);
        }
      }
    }
    return { ok: 1 };
  }
}

export function createInMemoryDatabase() {
  const collections: Record<string, InMemoryCollection> = {
    users: new InMemoryCollection(),
    summons: new InMemoryCollection(),
    witnesses: new InMemoryCollection(),
    notifications: new InMemoryCollection(),
    fcm_tokens: new InMemoryCollection(),
    test_connection: new InMemoryCollection(),
  };

  // Seed default demo officers and summons
  seedInitialData(collections).catch((err) => {
    console.warn('[MockDB] Seed error:', err);
  });

  return {
    isInMemory: true,
    collection: (name: string) => {
      if (!collections[name]) {
        collections[name] = new InMemoryCollection();
      }
      return collections[name];
    },
    command: async (_cmd: any) => ({ ok: 1 }),
  };
}

export async function seedInitialData(collections: Record<string, InMemoryCollection>) {
  const defaultPasswordHash = await bcrypt.hash('Police@2026', 10);

  // 1. Officers
  const usersCollection = collections.users;
  if (usersCollection.items.length === 0) {
    const officerRajesh = {
      _id: 'user_si_rajesh',
      email: 'dl-pol-4402@delhipolice.gov.in',
      password: defaultPasswordHash,
      displayName: 'Sub-Insp. Rajesh Sharma',
      badgeNumber: 'DL-POL-4402',
      policeStation: 'Connaught Place PS',
      district: 'Central District, Delhi',
      rank: 'Sub-Inspector',
      authProvider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const officerVikram = {
      _id: 'user_insp_vikram',
      email: 'dl-pol-7821@delhipolice.gov.in',
      password: defaultPasswordHash,
      displayName: 'Insp. Vikram Rathore',
      badgeNumber: 'DL-POL-7821',
      policeStation: 'PS Tis Hazari',
      district: 'Central District, Delhi',
      rank: 'Inspector',
      authProvider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersCollection.items.push(officerRajesh, officerVikram);
  }

  // 2. Summons
  const summonsCollection = collections.summons;
  if (summonsCollection.items.length === 0) {
    const initialSummons = [
      {
        _id: 'sum_101',
        userId: 'user_si_rajesh',
        summonNumber: 'SUM/DEL/2026/0482',
        caseNumber: 'FIR 142/2025 PS Connaught Place',
        personName: 'Rameshwar Dayal Verma',
        fatherName: 'Late Shri Om Prakash Verma',
        address: 'House No. B-42, Sector 14, Rohini, New Delhi 110085',
        courtName: 'Tis Hazari District Court, Courtroom No. 302',
        courtAddress: 'Tis Hazari Courts Complex, Delhi 110054',
        policeStation: 'Connaught Place PS',
        district: 'Central District, Delhi',
        state: 'Delhi',
        issueDate: '2026-09-10',
        hearingDate: '2026-09-22',
        status: 'Pending',
        urgency: 'Urgent',
        offenseCharges: 'Sec 420, 406 IPC (Cheating and Criminal Breach of Trust)',
        issuingAuthority: 'Chief Metropolitan Magistrate (Central)',
        officerDetails: 'SI Rajesh Sharma (Badge DL-POL-4402)',
        reminderEnabled: true,
        notes: 'Witness testimony required regarding bank audit records.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'sum_102',
        userId: 'user_si_rajesh',
        summonNumber: 'WNT/DEL/2026/1109',
        caseNumber: 'CC 892/2024 Tis Hazari',
        personName: 'Dr. Sunita Deshmukh',
        fatherName: 'Shri Manohar Deshmukh',
        address: 'Flat 7B, Pocket 4, Mayur Vihar Phase 1, Delhi 110091',
        courtName: 'Special CBI Court, Rouse Avenue Complex',
        courtAddress: 'Rouse Avenue Court Complex, DDU Marg, New Delhi 110002',
        policeStation: 'Connaught Place PS',
        district: 'Central District, Delhi',
        state: 'Delhi',
        issueDate: '2026-09-12',
        hearingDate: '2026-09-28',
        status: 'Pending',
        urgency: 'High',
        offenseCharges: 'Expert Medical Witness Deposition in Cross-Examination',
        issuingAuthority: 'Special Judge (PC Act)',
        officerDetails: 'SI Rajesh Sharma (Badge DL-POL-4402)',
        reminderEnabled: true,
        notes: 'Summon served via personal delivery; receipt on record.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'sum_103',
        userId: 'user_si_rajesh',
        summonNumber: 'SUM/DEL/2026/0219',
        caseNumber: 'FIR 98/2025 PS Barakhamba',
        personName: 'Harpreet Singh Batra',
        fatherName: 'Shri Gurmukh Singh',
        address: 'Plot 18, Block C, Lajpat Nagar III, New Delhi 110024',
        courtName: 'Patiala House District Courts',
        courtAddress: 'India Gate Circle, New Delhi 110001',
        policeStation: 'Connaught Place PS',
        district: 'Central District, Delhi',
        state: 'Delhi',
        issueDate: '2026-08-20',
        hearingDate: '2026-09-15',
        status: 'Served',
        urgency: 'Standard',
        offenseCharges: 'Sec 138 Negotiable Instruments Act',
        issuingAuthority: 'Metropolitan Magistrate 04',
        officerDetails: 'SI Rajesh Sharma (Badge DL-POL-4402)',
        reminderEnabled: false,
        servedAt: '2026-09-02T14:30:00.000Z',
        servedNotes: 'Handed over to person summoned with signature.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'sum_104',
        userId: 'user_insp_vikram',
        summonNumber: 'SUM/DEL/2026/0891',
        caseNumber: 'FIR 310/2025 PS Tis Hazari',
        personName: 'Manish Chawla',
        fatherName: 'Shri Ved Prakash Chawla',
        address: 'B-12, Model Town II, Delhi 110009',
        courtName: 'Tis Hazari District Court, Courtroom 112',
        courtAddress: 'Tis Hazari Courts Complex, Delhi 110054',
        policeStation: 'PS Tis Hazari',
        district: 'Central District, Delhi',
        state: 'Delhi',
        issueDate: '2026-09-05',
        hearingDate: '2026-09-24',
        status: 'Pending',
        urgency: 'Urgent',
        offenseCharges: 'Sec 379, 411 IPC (Theft and Dishonestly Receiving Stolen Property)',
        issuingAuthority: 'Additional Chief Metropolitan Magistrate',
        officerDetails: 'Insp. Vikram Rathore (Badge DL-POL-7821)',
        reminderEnabled: true,
        notes: 'Summons dispatched via registered post and beat constable.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    summonsCollection.items.push(...initialSummons);
  }

  // 3. Witnesses
  const witnessesCollection = collections.witnesses;
  if (witnessesCollection.items.length === 0) {
    const initialWitnesses = [
      {
        _id: 'wit_201',
        userId: 'user_si_rajesh',
        name: 'Dr. Sunita Deshmukh',
        phone: '+91 98112 34567',
        email: 'dr.sunita@aiims.edu.in',
        role: 'Forensic Expert / Medical Officer',
        associatedCase: 'CC 892/2024 Tis Hazari',
        address: 'AIIMS Department of Forensic Medicine, Ansari Nagar, New Delhi',
        notes: 'Available for deposition on Tuesday mornings.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'wit_202',
        userId: 'user_si_rajesh',
        name: 'Anand Swaroop Gupta',
        phone: '+91 98710 98765',
        email: 'asgupta.audit@gmail.com',
        role: 'Chartered Accountant / Financial Witness',
        associatedCase: 'FIR 142/2025 PS Connaught Place',
        address: '14 Barakhamba Road, Connaught Place, New Delhi 110001',
        notes: 'Produced seizure memo on 15-Aug-2025.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'wit_203',
        userId: 'user_insp_vikram',
        name: 'Subhash Chandra Bose',
        phone: '+91 99100 11223',
        email: 'subhash.c@delhigov.in',
        role: 'Public Witness / Panch',
        associatedCase: 'FIR 310/2025 PS Tis Hazari',
        address: 'Shop 4, Kashmiri Gate, Delhi 110006',
        notes: 'Eye witness to recovery of stolen equipment.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    witnessesCollection.items.push(...initialWitnesses);
  }
}
