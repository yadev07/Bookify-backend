const buildFilterQuery = (query) => {
  const filter = {};

  // Date range filter
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }

  // Status filter
  if (query.status) filter.status = query.status;

  // User filter
  if (query.user) filter.user = query.user;

  // Provider filter
  if (query.provider) filter.provider = query.provider;

  // Service filter
  if (query.service) filter.service = query.service;

  // Search filter (for text fields)
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { title: { $regex: query.search, $options: 'i' } }
    ];
  }

  return filter;
};

module.exports = buildFilterQuery; 