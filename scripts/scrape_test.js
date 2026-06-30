const cheerio = require('cheerio');

async function scrape() {
  try {
    const resAr = await fetch('https://msgg.gov.mr/ar/le-journal-officiel-ar.html');
    const htmlAr = await resAr.text();
    const $ar = cheerio.load(htmlAr);
    
    console.log('Arabic version:');
    $ar('a').each((i, el) => {
      const text = $ar(el).text().trim();
      const href = $ar(el).attr('href');
      if (href && href.toLowerCase().includes('.pdf')) {
        console.log(`- ${text}: ${href}`);
      }
    });

    const resFr = await fetch('https://msgg.gov.mr/fr/le-journal-officiel.html');
    const htmlFr = await resFr.text();
    const $fr = cheerio.load(htmlFr);
    
    console.log('\nFrench version:');
    $fr('a').each((i, el) => {
      const text = $fr(el).text().trim();
      const href = $fr(el).attr('href');
      if (href && href.toLowerCase().includes('.pdf')) {
        console.log(`- ${text}: ${href}`);
      }
    });

  } catch(e) {
    console.error(e);
  }
}
scrape();
