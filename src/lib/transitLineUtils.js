const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = value => typeof value === 'string' && UUID_PATTERN.test(value);

// A product may belong to a transit group while still being an exact, sellable
// product. A sales line is a flexible group line only when it was explicitly
// created as one, or when it has a group target and no valid product target.
export const isTransitGroupLine = (item = {}) => {
  if (item.is_transit_group === true || item.product?.is_transit_group === true) return true;

  const productId = item.product_id || item.product?.id || null;
  const groupId = item.transit_group_id || item.product?.transit_group_id || null;
  return !isUuid(productId) && isUuid(groupId);
};

export const getTransitGroupLineId = (item = {}) => {
  if (!isTransitGroupLine(item)) return null;
  return item.transit_group_id || item.product?.transit_group_id || null;
};
