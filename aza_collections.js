import fetch from 'node-fetch';

async function test() {
  const url = 'https://www.azafashions.com/collection/women/kurta-sets';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    const propsData = data.props.pageProps.data;
    if (propsData && propsData.list) {
        console.log("List length:", propsData.list.length);
        if (propsData.list.length > 0) {
            console.log("First item:", propsData.list[0].url || propsData.list[0].slug);
            console.log("First item keys:", Object.keys(propsData.list[0]));
        }
    }
  }
}
test();
