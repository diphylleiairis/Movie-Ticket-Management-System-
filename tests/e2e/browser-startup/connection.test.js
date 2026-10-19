import { Selector } from 'testcafe';

fixture('TestCafe browser startup').page(process.env.BROWSER_SMOKE_URL);

test('A fresh browser connects to TestCafe and reads a loopback page', async t => {
  await t.expect(Selector('h1').innerText).eql('Browser connection OK');
});
