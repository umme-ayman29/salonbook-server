export function verifyAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin only' });
  }
  next();
}

export function verifyCustomer(req, res, next) {
  if (req.user?.role !== 'customer') {
    return res.status(403).json({ message: 'Forbidden: customer only' });
  }
  next();
}