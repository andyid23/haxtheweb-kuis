import { html, fixture, expect } from '@open-wc/testing';
import "../quiz-dashboard-lite2.js";

describe("QuizDashboardLite2 test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`
      <quiz-dashboard-lite2
        title="title"
      ></quiz-dashboard-lite2>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
