export type ZipResult = {
  zipcode: string;
  prefcode: string;
  address1: string; // 都道府県
  address2: string; // 市区町村
  address3: string; // 町域
};

export async function lookupZip(zipcode: string): Promise<ZipResult | null> {
  const z = zipcode.replace(/\D/g, "");
  if (z.length < 7) return null;
  const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${z}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 200 || !json.results || !json.results[0]) return null;
  const r = json.results[0];
  return {
    zipcode: r.zipcode,
    prefcode: r.prefcode,
    address1: r.address1,
    address2: r.address2,
    address3: r.address3,
  };
}
