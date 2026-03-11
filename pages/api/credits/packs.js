import connectToDatabase from '../../../lib/mongodb';
import { getActivePacks, getActiveOffers, getBestOfferForPack, applyOffer } from '../../../lib/pricingHelpers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  await connectToDatabase();
  const packs = await getActivePacks();
  const offers = await getActiveOffers();
  const packsWithOffers = await Promise.all(
    packs.map(async (pack) => {
      const offer = await getBestOfferForPack(pack.id || pack.packId);
      const price = pack.price || 0;
      const { discountedPrice, discountAmount } = offer ? applyOffer(price, offer) : { discountedPrice: price, discountAmount: 0 };
      return {
        ...pack,
        originalPrice: price,
        offerPrice: discountedPrice,
        offerDiscount: discountAmount,
        offer: offer ? { title: offer.title, discountType: offer.discountType, discountValue: offer.discountValue } : null,
      };
    })
  );
  return res.status(200).json({ packs: packsWithOffers, offers });
}
