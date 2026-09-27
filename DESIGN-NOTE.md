## 1. Scraping Reliability

The scraper was designed for unattended execution, where the target site may respond slowly, fail intermittently, change UI state, or require browser interaction before exposing the price.

### Browser automation where necessary

The scraper uses Playwright rather than relying entirely on HTTP requests because the product page contains behavior that cannot reliably be reproduced with simple HTML fetching. In particular:

* Product options must be selected before scraping the relevant information.
* The price is initially locked and becomes available only after human-like mouse movement over the price control.
* The page can display different states such as a ready price, a failed price load, or a retry state.
* A cookie/rejection prompt can appear nondeterministically.

The browser therefore performs the same meaningful interactions required by the page instead of depending on fragile direct API assumptions.

### Explicit validation and retries

Important scraping steps are validated after they are performed. For operations that can fail transiently, the scraper retries up to three times before marking the scrape as failed.

A failed scrape is not treated as a successful scrape with missing data. Instead, the attempt is recorded with:

* timestamp
* product
* selected option
* outcome
* empty price/stock values when the scrape failed

This prevents temporary failures from silently producing misleading historical data.

### Handling the price interaction

One of the most important reliability issues was that ordinary DOM-level hover simulation did not activate the price control. The target site checks actual mouse movement and a minimum dwell time.

The final implementation uses Playwright's physical mouse movement API to move across the price control and then waits before attempting to read the price. This matches the site's interaction model more closely than simply calling `locator.hover()`.

### Defensive price parsing

The site does not always return prices in the same textual format. Examples included:

* `₹２２,４６５`
* `₹ ​3 ​, ​7 ​9 ​8`
* `₹18,018/-(incl.ofalltaxes)`
* `Rs. 41,453.00`

The scraper normalizes Unicode characters and removes invisible characters before extracting the numeric portion. Comma-formatted values are also normalized before numeric conversion.

This avoids treating formatting differences as scraping failures.

### Observable failures

Every scrape attempt has an explicit outcome rather than silently disappearing. This makes intermittent failures visible in the dashboard and allows the history to distinguish successful data from failed attempts.

The scraper can also be run in headed mode locally. This was useful during development and recording because it makes browser interactions and slow/failing states directly observable.

---

## 2. Tradeoffs

### Playwright vs. direct HTTP scraping

A lightweight HTTP scraper would be faster and consume fewer resources, but the target site deliberately contains browser-dependent behavior. Playwright was therefore used where browser interaction was actually required.

The tradeoff is higher CPU/memory usage and slower execution, but this is acceptable for the assignment because reliability of the scheduled scrape is more important than minimizing browser overhead.

### Fixed retry limit

The scraper uses a bounded retry policy rather than retrying indefinitely. This prevents a permanently broken page or changed UI from causing a scheduled job to run forever.

The tradeoff is that a temporary failure occurring after the final retry will still be recorded as failed. This is preferable to hiding the failure or blocking subsequent tracked products.

### Simple sequential processing

Tracked products are scraped sequentially rather than concurrently. Parallel scraping could reduce total execution time, but it would increase browser/resource usage and make failures and debugging more complicated.

For the small number of products required by the assignment, sequential execution is sufficient and keeps the behavior predictable.

### External scheduling

Scraping is triggered by an external cron service every two hours rather than relying on an in-process timer. This is important because the backend runs on a free hosting tier that may sleep when idle.

The tradeoff is dependence on the external scheduler, but it avoids assuming that a sleeping backend can maintain an in-memory timer.

---

## 3. AI-Assisted Development: Initial Mistakes and Corrections

AI tools were used during development, but several initial suggestions did not work correctly against the actual behavior of the target site. These were corrected through direct testing rather than being accepted without verification.

### Incorrect assumption about hover behavior

The initial implementation attempted to activate the price control using normal Playwright locator hover behavior. This did not consistently unlock the price because the target site was checking actual mouse movement and dwell time.

I tested the behavior against the real page and found that the DOM-level interaction was insufficient. The implementation was changed to use Playwright's `page.mouse.move()` with multiple physical movements across the control followed by a short wait.

### Incorrect assumptions about page behavior

The scraper initially treated the page as if the price would simply become available after selecting an option. Testing showed that the page could remain locked or enter a failed state and expose a retry mechanism.

The scraper was therefore changed to explicitly validate the expected state and retry the operation instead of assuming that the first interaction succeeded.

### Incorrect price parsing

An initial implementation extracted the numeric price but converted values such as `"22,465"` directly with `Number()`. Because JavaScript does not parse comma-separated numbers in that form, this could result in an invalid numeric value.

Testing with the site's actual price formats exposed the problem. The parser was corrected to remove thousands separators before numeric conversion and to normalize Unicode and invisible characters first.

### Fragile attempt to automate the cookie prompt

An initial attempt used Playwright's locator handler to automatically dismiss the cookie prompt. In practice, the handler introduced a browser/page lifecycle error (`Target page, context or browser has been closed`).

Rather than adding increasingly complicated automation around a nondeterministic prompt, that approach was removed. The scraper was kept simpler and tested against the actual behavior of the target site.

### General correction process

The main lesson from the AI-assisted development was that generated code was treated as a starting point rather than as verified behavior. Reliability-critical parts of the scraper were validated against the actual storefront, especially:

1. browser interaction requirements
2. loading and retry behavior
3. price formats
4. failure states
5. browser lifecycle behavior

This testing-driven process resulted in a scraper that records failures explicitly instead of assuming that a successful browser action or HTTP response necessarily means that correct product data was obtained.
