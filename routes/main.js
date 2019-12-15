const express = require('express');
const router = express.Router();

module.exports = (io) => {

   router.get('/', (req, res) => {
      res.redirect('/log_employee.html');
   });

   router.get('/enroll-admin', (req, res) => {
      res.redirect('/enroll_admin.html');
   });

   router.get('/enroll-employee', (req, res) => {
      res.redirect('/enroll_employee.html');
   })

   return router;
}