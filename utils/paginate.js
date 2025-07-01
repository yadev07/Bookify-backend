const paginate = async (Model, filter = {}, query = {}, populate = []) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  let dbQuery = Model.find(filter).skip(skip).limit(limit);
  if (populate && Array.isArray(populate) && populate.length > 0) {
    populate.forEach(pop => {
      dbQuery = dbQuery.populate(pop);
    });
  }

  const [results, total] = await Promise.all([
    dbQuery,
    Model.countDocuments(filter)
  ]);

  return {
    results,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  };
};

module.exports = paginate; 