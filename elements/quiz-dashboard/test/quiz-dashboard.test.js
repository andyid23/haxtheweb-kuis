import { html, fixture, expect } from '@open-wc/testing';
import "../quiz-dashboard.js";

describe("QuizDashboard test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`
      <quiz-dashboard
        title="title"
      ></quiz-dashboard>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
