// HTML fixtures covering the required test scenarios: unchanged, text
// changed, text added, text removed, price changed, dynamic timestamp,
// missing selector.

const unchangedBefore = `
<html><body>
  <div id="exam-schedule">
    <h2>B.Tech 6th Semester Examination Schedule</h2>
    <p>Exam starts: 12 September 2026</p>
  </div>
</body></html>`;

const unchangedAfter = unchangedBefore; // identical

const textChangedBefore = `
<html><body>
  <div id="exam-schedule">
    <h2>B.Tech 6th Semester Examination Schedule</h2>
    <p>Exam starts: 12 September 2026</p>
  </div>
</body></html>`;

const textChangedAfter = `
<html><body>
  <div id="exam-schedule">
    <h2>B.Tech 6th Semester Examination Schedule</h2>
    <p>Exam starts: 15 September 2026</p>
  </div>
</body></html>`;

const textAddedBefore = `
<html><body>
  <div id="notice"><p>Registration is open.</p></div>
</body></html>`;

const textAddedAfter = `
<html><body>
  <div id="notice"><p>Registration is open. Last date to apply is October 1st.</p></div>
</body></html>`;

const textRemovedBefore = `
<html><body>
  <div id="notice"><p>Registration is open. Late fee applies after August 30.</p></div>
</body></html>`;

const textRemovedAfter = `
<html><body>
  <div id="notice"><p>Registration is open.</p></div>
</body></html>`;

const priceChangedBefore = `
<html><body>
  <div id="price-box"><p>Price: ₹49,999</p></div>
</body></html>`;

const priceChangedAfter = `
<html><body>
  <div id="price-box"><p>Price: ₹44,999</p></div>
</body></html>`;

const dynamicTimestampBefore = `
<html><body>
  <div id="notice">
    <p>Exam starts: 12 September 2026</p>
    <span class="meta">Last updated: 2026-08-20T10:00:00Z</span>
  </div>
</body></html>`;

const dynamicTimestampAfter = `
<html><body>
  <div id="notice">
    <p>Exam starts: 12 September 2026</p>
    <span class="meta">Last updated: 2026-08-25T14:32:11Z</span>
  </div>
</body></html>`;

const missingSelectorHtml = `
<html><body>
  <div id="something-else"><p>Unrelated content</p></div>
</body></html>`;

module.exports = {
  unchangedBefore,
  unchangedAfter,
  textChangedBefore,
  textChangedAfter,
  textAddedBefore,
  textAddedAfter,
  textRemovedBefore,
  textRemovedAfter,
  priceChangedBefore,
  priceChangedAfter,
  dynamicTimestampBefore,
  dynamicTimestampAfter,
  missingSelectorHtml,
};
