const router   = require('express').Router();
const auth     = require('../controllers/authController');
const user     = require('../controllers/userController');
const mod      = require('../controllers/moduleController');
const master   = require('../controllers/masterController');
const location = require('../controllers/locationController');
const profile  = require('../controllers/profileController');
const cpo      = require('../controllers/cpoController');
const spo      = require('../controllers/spoController');
const jpo      = require('../controllers/jpoController');
const { verifyToken, requireAdmin, checkPermission } = require('../middleware/auth');

// ── Auth ─────────────────────────────────────────────────────
router.post('/auth/login',    auth.login);
router.get ('/auth/me',       verifyToken, auth.getMe);
router.put ('/auth/password', verifyToken, auth.changePassword);

// ── Profile ───────────────────────────────────────────────────
router.get('/profile/me', verifyToken, profile.getMe);
router.put('/profile/me', verifyToken, profile.updateMe);

// ── Location ─────────────────────────────────────────────────
router.post('/location',           verifyToken, location.save);
router.get ('/location/me',        verifyToken, location.getMe);
router.get ('/location/all',       verifyToken, requireAdmin, location.getAll);
router.get ('/location/employees', verifyToken, requireAdmin, location.getLatestPerEmployee);

// ── Users ─────────────────────────────────────────────────────
router.get   ('/users',                 verifyToken, requireAdmin, user.getAll);
router.get   ('/users/:id',             verifyToken, requireAdmin, user.getOne);
router.post  ('/users',                 verifyToken, requireAdmin, user.create);
router.put   ('/users/:id',             verifyToken, requireAdmin, user.update);
router.delete('/users/:id',             verifyToken, requireAdmin, user.remove);
router.put   ('/users/:id/permissions', verifyToken, requireAdmin, user.updatePermissions);
router.patch ('/users/:id/toggle',      verifyToken, requireAdmin, user.toggle);

// ── Legacy Module CRUD ────────────────────────────────────────
const crud = (path, perm, ctrl) => {
  router.get   (`/${path}/stats`, verifyToken, checkPermission(perm,'view'),   ctrl.stats);
  router.get   (`/${path}`,       verifyToken, checkPermission(perm,'view'),   ctrl.getAll);
  router.get   (`/${path}/:id`,   verifyToken, checkPermission(perm,'view'),   ctrl.getOne);
  router.post  (`/${path}`,       verifyToken, checkPermission(perm,'add'),    ctrl.create);
  router.put   (`/${path}/:id`,   verifyToken, checkPermission(perm,'edit'),   ctrl.update);
  router.delete(`/${path}/:id`,   verifyToken, checkPermission(perm,'delete'), ctrl.remove);
};

crud('customer-po', 'customer_po', mod.customerPO);
crud('inward',      'inward',      mod.inward);
crud('outward',     'outward',     mod.outward);
crud('jobwork',     'jobwork',     mod.jobwork);
crud('sales',       'sales',       mod.sales);
crud('enquiry',     'enquiry',     mod.enquiry);
crud('returns',     'return',      mod.returns);
crud('sampling',    'sampling',    mod.sampling);

// ── Master Data ───────────────────────────────────────────────
router.get('/master/all',         verifyToken, master.getAllForDropdowns);
router.get('/master/stats',       verifyToken, requireAdmin, master.dashboardStats);
router.get('/master/cpo-preview', verifyToken, master.previewCPO);
router.get   ('/master/:type',     verifyToken, checkPermission('master_data','view'),   master.getAll);
router.post  ('/master/:type',     verifyToken, checkPermission('master_data','add'),    master.create);
router.put   ('/master/:type/:id', verifyToken, checkPermission('master_data','edit'),   master.update);
router.delete('/master/:type/:id', verifyToken, checkPermission('master_data','delete'), master.remove);

// ── CPO ───────────────────────────────────────────────────────
router.get   ('/orders/cpo/preview-no', verifyToken, cpo.previewNo);
router.get   ('/orders/cpo',            verifyToken, cpo.getAll);
router.get   ('/orders/cpo/:id',        verifyToken, cpo.getOne);
router.post  ('/orders/cpo',            verifyToken, cpo.create);
router.put   ('/orders/cpo/:id',        verifyToken, cpo.update);
router.delete('/orders/cpo/:id',        verifyToken, cpo.remove);
// PDF — NO auth (browser opens directly, no auth header possible)
router.get   ('/orders/cpo/:id/pdf',    cpo.getPDF);

// ── SPO ───────────────────────────────────────────────────────
router.get   ('/orders/spo/fetch-cpo',  verifyToken, spo.fetchCPO);
router.get   ('/orders/spo',            verifyToken, spo.getAll);
router.get   ('/orders/spo/:id',        verifyToken, spo.getOne);
router.post  ('/orders/spo',            verifyToken, spo.create);
router.put   ('/orders/spo/:id',        verifyToken, spo.update);
router.delete('/orders/spo/:id',        verifyToken, spo.remove);
// PDF — NO auth
router.get   ('/orders/spo/:id/pdf',    spo.getPDF);

// ── JPO ───────────────────────────────────────────────────────
router.get   ('/orders/jpo/fetch-cpo',  verifyToken, jpo.fetchCPO);
router.get   ('/orders/jpo',            verifyToken, jpo.getAll);
router.get   ('/orders/jpo/:id',        verifyToken, jpo.getOne);
router.post  ('/orders/jpo',            verifyToken, jpo.create);
router.put   ('/orders/jpo/:id',        verifyToken, jpo.update);
router.delete('/orders/jpo/:id',        verifyToken, jpo.remove);
// PDF — NO auth
router.get   ('/orders/jpo/:id/pdf',    jpo.getPDF);

module.exports = router;
