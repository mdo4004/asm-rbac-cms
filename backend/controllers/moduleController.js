const db = require('../config/db');
const masterCtrl = require('./masterController');

const cfg = {
  customer_po: {
    table:  'customer_po',
    fields: ['cpo_number','po_number','po_date','customer_name','selling_firm','quality_name',
             'finish_qty','greige_qty','delivery_date','merchant_name','followuper',
             'color','width','status','notes','gsm','fabric_type','mill_name','weaver_name'],
    search: ['cpo_number','po_number','customer_name','quality_name','selling_firm'],
    dateField: 'po_date',
    filterFields: ['cpo_number','po_number','customer_name','selling_firm','quality_name','status','merchant_name'],
  },
  inward: {
    table:  'inward',
    fields: ['bill_no','inward_date','firm_name','party_name','quality_name',
             'pieces','grey_meter','rate','amount','lot_no','width','po_reference','notes'],
    search: ['bill_no','party_name','quality_name'],
    dateField: 'inward_date',
    filterFields: ['bill_no','party_name','firm_name','quality_name'],
    amountField: 'amount',
  },
  outward: {
    table:  'outward',
    fields: ['chalan_no','chalan_date','firm_name','mill_name','quality_name',
             'pieces','grey_meter','width','po_reference','notes'],
    search: ['chalan_no','firm_name','quality_name'],
    dateField: 'chalan_date',
    filterFields: ['chalan_no','firm_name','mill_name','quality_name'],
  },
  jobwork: {
    table:  'jobwork',
    fields: ['jw_date','mill_name','bill_no','quality_name','firm_name',
             'pieces','grey_meter','finish_meter','rate','amount','po_reference','notes'],
    search: ['bill_no','mill_name','quality_name'],
    dateField: 'jw_date',
    filterFields: ['bill_no','mill_name','firm_name','quality_name'],
    amountField: 'amount',
  },
  sales: {
    table:  'sales',
    fields: ['invoice_no','bill_date','firm_name','buyer_name','bales','meters',
             'rate','total_amount','merchant_name','work_type','city','transport','po_reference','notes'],
    search: ['invoice_no','buyer_name','firm_name'],
    dateField: 'bill_date',
    filterFields: ['invoice_no','buyer_name','firm_name','merchant_name'],
    amountField: 'total_amount',
  },
  enquiry: {
    table:  'enquiry',
    fields: ['enquiry_date','customer_name','quality_name','quantity','requirement',
             'status','followup_date','assigned_to','notes'],
    search: ['customer_name','quality_name','status'],
    dateField: 'enquiry_date',
    filterFields: ['customer_name','quality_name','status'],
  },
  returns: {
    table:  'returns',
    fields: ['return_date','party_name','invoice_ref','quality_name',
             'pieces','meters','reason','status','notes'],
    search: ['party_name','invoice_ref','quality_name'],
    dateField: 'return_date',
    filterFields: ['party_name','invoice_ref','quality_name','status'],
  },
  sampling: {
    table:  'sampling',
    fields: ['sample_date','customer_name','quality_name','meters',
             'color','design','status','feedback','notes'],
    search: ['customer_name','quality_name','status'],
    dateField: 'sample_date',
    filterFields: ['customer_name','quality_name','status','color'],
  },
};

const make = (key) => {
  const c = cfg[key];
  return {
    getAll: async (req, res) => {
      try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;
        const search     = (req.query.search     || '').trim();
        const date_from  = (req.query.date_from  || '').trim();
        const date_to    = (req.query.date_to    || '').trim();
        const amount_min = req.query.amount_min;
        const amount_max = req.query.amount_max;

        const extraFilters = {};
        if (c.filterFields) {
          c.filterFields.forEach(f => {
            if (req.query[f]) extraFilters[f] = req.query[f].trim();
          });
        }

        let conditions = [];
        let params = [];

        if (search) {
          conditions.push('(' + c.search.map(f => `${f} LIKE ?`).join(' OR ') + ')');
          c.search.forEach(() => params.push(`%${search}%`));
        }
        if (date_from && c.dateField) {
          conditions.push(`${c.dateField} >= ?`);
          params.push(date_from);
        }
        if (date_to && c.dateField) {
          conditions.push(`${c.dateField} <= ?`);
          params.push(date_to);
        }
        if (amount_min && c.amountField) {
          conditions.push(`${c.amountField} >= ?`);
          params.push(parseFloat(amount_min));
        }
        if (amount_max && c.amountField) {
          conditions.push(`${c.amountField} <= ?`);
          params.push(parseFloat(amount_max));
        }
        Object.entries(extraFilters).forEach(([field, val]) => {
          conditions.push(`${field} LIKE ?`);
          params.push(`%${val}%`);
        });

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const limitNum  = parseInt(limit);
        const offsetNum = parseInt(offset);

        const [rows] = await db.query(
          `SELECT * FROM ${c.table} ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
          params
        );
        const [[{ total }]] = await db.query(
          `SELECT COUNT(*) AS total FROM ${c.table} ${where}`, params
        );
        res.json({ success: true, data: rows, total, page, pages: Math.ceil(total / limit) });
      } catch (e) {
        console.error('getAll error:', e.message);
        res.status(500).json({ success: false, message: e.message });
      }
    },

    getOne: async (req, res) => {
      try {
        const [rows] = await db.execute(`SELECT * FROM ${c.table} WHERE id = ?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
      } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    },

    stats: async (req, res) => {
      try {
        const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM ${c.table}`);
        res.json({ success: true, data: { total } });
      } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    },

    create: async (req, res) => {
      try {
        const body = req.body;
        const cols = c.fields.filter(f => body[f] !== undefined && body[f] !== null && f !== 'cpo_number');
        if (!cols.length) return res.status(400).json({ success: false, message: 'No data provided' });
        const vals = cols.map(f => body[f]);

        let cpo_number = null;
        if (key === 'customer_po' && body.selling_firm) {
          const firmName = body.selling_firm;
          try {
            const [firms] = await db.execute('SELECT id, prefix FROM master_firms WHERE name = ?', [firmName]);
            const pfx  = firms[0]?.prefix || 'ASM';
            const year = new Date().getFullYear();
            const [[{ seq }]] = await db.execute(
              'SELECT COUNT(*) + 1 AS seq FROM customer_po WHERE selling_firm=? AND YEAR(created_at)=?',
              [firmName, year]
            );
            cpo_number = `${pfx}/${year}/${String(seq).padStart(4,'0')}`;
          } catch(e) {}
        }

        const allCols = cpo_number ? [...cols, 'cpo_number', 'created_by'] : [...cols, 'created_by'];
        const allVals = cpo_number ? [...vals, cpo_number, req.user.id] : [...vals, req.user.id];

        const [result] = await db.execute(
          `INSERT INTO ${c.table} (${allCols.join(',')}) VALUES (${allCols.map(()=>'?').join(',')})`,
          allVals
        );
        res.status(201).json({ success: true, id: result.insertId, cpo_number });
      } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    },

    update: async (req, res) => {
      try {
        const body = req.body;
        const cols = c.fields.filter(f => body[f] !== undefined && f !== 'cpo_number');
        if (!cols.length) return res.status(400).json({ success: false, message: 'No fields to update' });
        const vals = [...cols.map(f => body[f]), req.params.id];
        await db.execute(
          `UPDATE ${c.table} SET ${cols.map(f=>`${f}=?`).join(',')} WHERE id=?`, vals
        );
        res.json({ success: true, message: 'Updated' });
      } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    },

    remove: async (req, res) => {
      try {
        await db.execute(`DELETE FROM ${c.table} WHERE id=?`, [req.params.id]);
        res.json({ success: true, message: 'Deleted' });
      } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    },
  };
};

exports.customerPO = make('customer_po');
exports.inward     = make('inward');
exports.outward    = make('outward');
exports.jobwork    = make('jobwork');
exports.sales      = make('sales');
exports.enquiry    = make('enquiry');
exports.returns    = make('returns');
exports.sampling   = make('sampling');