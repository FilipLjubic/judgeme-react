# Working Judge.me Questions & Answers spike

Date: 2026-07-13  
Scope: official Shopify placement, current tokenless question feed, public submission route, dashboard settings, deployed extension internals, native React adapter, Free-plan behavior, and Hydrogen verification

## Result

Judge.me product questions can be read and submitted from Hydrogen without either Judge.me token. The current Shopify implementation does not expose Questions & Answers as an independent app block: it places a Questions tab and Ask a question form inside the new Review Widget, while the question count belongs inside the Star Rating Badge. The React library therefore implements a native, independently composable `QuestionsAndAnswers` surface backed by Judge.me's actual Q&A routes and shared dashboard configuration.

This is an interoperability adapter, not a claim that Judge.me officially supports a standalone headless Q&A widget. Judge.me's [Questions and Answers Widget guide](https://judge.me/help/en/articles/8420858-questions-and-answers-widget-q-a-widget) lists the feature on the Awesome plan and requires the new Review Widget. The [widget catalog](https://judge.me/help/en/articles/8415708-judge-me-widgets) likewise describes Questions & Answers as part of the Review Widget experience.

## Official Shopify behavior

The current official contract is:

- the Review Widget contains a Questions tab and the Ask a question button;
- the Star Rating Badge can show the question count;
- the Reviews tab must remain first;
- the current Q&A experience requires the new Review Widget;
- submitted questions are moderated before publication;
- stores answer questions in Judge.me, and can optionally let customers answer;
- dashboard settings cover the form title, question field label and placeholder, success heading/body, and question-count badge position/icon/text/color.

Judge.me notes that stores installed after 2025-12-09 may have the new Review Widget enabled by default. That date and the Awesome entitlement are official product behavior, not properties inferred by this adapter.

## Current read contract

The `judgeme-624` deployment calls this undocumented route:

```text
GET https://api.judge.me/api/questions/questions_for_widget
```

Observed query fields:

- `product_id=<Shopify numeric product ID>`;
- `page=<positive integer>`;
- `json_request=true`;
- `shop_domain=<permanent myshopify.com domain>`;
- `platform=shopify`;
- optional `preview_mode=sample_data` for Judge.me's own read-only preview fixture.

No public or private token is sent. On 2026-07-13, the live request for product `15151876309375` returned HTTP 200, `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=0, private, must-revalidate`, and:

```json
{
  "total_pages": 1,
  "current_page": 1,
  "per_page": 5,
  "questions": []
}
```

The test store has no published product questions. Its official `sample_data` response supplies two questions per page and this normalized shape:

```ts
type Question = {
  uuid: string;
  content_html: string;
  created_at: string;
  shop_as_asker: boolean;
  asker_name: string;
  asker_initial: string;
  answers: Array<{
    uuid: string;
    content_html: string;
    created_at: string;
    shop_as_answerer: boolean;
    answerer_name: string;
    answerer_initial: string;
  }>;
};
```

The sample route reports two pages but currently repeats the same semantic questions on page two with different UUIDs. The harness does not show sample pagination, and the component also de-duplicates by author/date/content as a defensive measure. Live pagination remains enabled.

`fetchQuestionsAndAnswersPage` validates pagination, IDs, dates, public names, and nested answers. Question/answer HTML is reduced to plain display text before it enters React, so shopper content is never injected with `dangerouslySetInnerHTML`.

## Current write contract

The deployed Review Widget posts multipart form data to:

```text
POST https://api.judge.me/api/questions
```

Observed fields:

- `name`;
- `email`;
- `question_content`, with the current form limiting it to 200 characters;
- `id`, the numeric Shopify product ID;
- `product_title`;
- `handle`;
- `shop_domain`;
- `platform=shopify`;
- optional `shop_consent_token` when Judge.me's sign-in/consent flow supplies one.

The browser request must stay a CORS-simple `multipart/form-data` POST. An `OPTIONS` preflight returned HTTP 404, while a multipart POST response included `Access-Control-Allow-Origin: *`. The adapter deliberately sets no `Content-Type` header so the browser creates the multipart boundary without triggering a preflight. It adds only the safelisted `Accept: application/json` header.

An empty diagnostic multipart POST returned HTTP 200 with `{}` and did not create a published question; an immediate live read remained empty. This means HTTP success alone is not evidence that Judge.me validated or queued a question. `submitQuestion` therefore enforces required name, email, product, and question fields plus current length limits before making the request. A real shopper submission was not sent during this spike because it would enter the store's moderation workflow.

## Deployed extension internals

The current extension deployment is rooted at:

```text
https://cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/
```

`manifest.json` maps the new Review Widget entry, while Q&A ships as internal chunks rather than a standalone entry:

- `QnaWidgetBody-BEx1gMqJ.js`;
- `AlignQuestionItem-D_ctwwVk.js`;
- `QuestionCardList-appYhOU_.js`;
- `CarouselQuestionList-ENk81APc.js`.

The internal body supports standard, align, cards, and carousel themes. It renders question and answer HTML, author initials/names, dates, and an answer label such as `Answer from {{ answerer_name }}:`. Only the cards body exposes its own load-more event; Q&A data ownership and the Ask form remain in the parent Review Widget manager.

Mounting these private Vue chunks independently would require reconstructing a parent store, internal design-system components, CSS, form state, and lifecycle that Judge.me does not expose. A native React surface is the more stable workaround while the external route contracts remain usable.

## Dashboard configuration mapping

`normalizeQuestionsAndAnswersConfig` consumes the current shared settings payload. Confirmed keys include:

- `review_widget_qna_enabled` and `review_widget_reviews_section_theme`;
- `widget_questions_and_answers_text`, `widget_open_question_form_text`, and `qna_content_screen_title_text`;
- question/name/email labels and placeholders;
- `qna_widget_question_required_field_error_text` and `write_review_flow_required_text`;
- `qna_widget_flow_gdpr_statement` and the fallback privacy message;
- submit/cancel and submitted-success text;
- `qna_widget_answer_reply_label`, reviewer name/anonymous behavior, and date format;
- primary/secondary, text, lighter-text, button/button-text, corner, title-size, and body-size values shared with the Review Widget.

The GDPR setting is converted to plain text instead of injecting configurable HTML. The dashboard-enabled flag is retained in data attributes for diagnostics but does not suppress the headless component; this lets a headless host use the public compatibility path even when the Shopify-native tab is unavailable.

## React and Hydrogen contract

The public API consists of:

- `fetchQuestionsAndAnswersPage`, a tokenless page read suitable beside the shared storefront batch;
- `fetchQuestionsAndAnswers`, a standalone convenience fetch that adds shared public settings;
- `createQuestionsAndAnswersData`, for combining a page with already-fetched settings and product metadata;
- `submitQuestion`, the real tokenless multipart write;
- `QuestionsAndAnswers`, the independently placeable React component.

The component renders the current questions/answers, standard/align/cards/carousel layouts, dashboard colors/text/sizing, live load-more pagination, an accessible modal form, Escape close, focus restoration, scroll-lock cleanup, validation, loading/error states, and the post-moderation success message. `onSubmitQuestion` can override the write for tests or a host-owned consent workflow.

The Hydrogen fixture uses `preview_mode=sample_data` because the live Free-plan response is empty. The surface labels that content as Judge.me sample data, disables its submit button, and never presents the fixture as a real store question. Q&A adds one server read to the current complete product loader, bringing the route from thirteen to fourteen Judge.me requests while reusing the existing settings payload.

## Brave verification

The installed Brave binary loaded the Hydrogen product route on port 3001. The Q&A surface rendered both official sample questions and nested answers with the dashboard's teal primary/secondary palette, labels, date format, soft corners, and full-width page layout. No Q&A client request was made on initial hydration because the first page came from loader data.

The Ask a question button opened a modal with `role=dialog`, `aria-modal=true`, the dashboard labels/placeholders/privacy copy, character counter, and a disabled preview-only submit control. Focus moved to Close; Escape closed the Q&A modal, restored body scrolling, and returned focus to Ask a question. The component produced no Q&A runtime or CSP errors.

The accumulated development console contained earlier Vite hot-reload export failures from before the library rebuild and an unrelated pre-existing Videos Carousel initialization timeout. Those are not Q&A failures; final validation clears the console before the clean reload.

## Limitations and monitoring

- These question routes are absent from Judge.me's current public OpenAPI document and can change without notice.
- The Free-plan store has Q&A disabled and no published live fixture, so publication after moderation and live multi-page data still require a seeded Awesome-plan store.
- Shopper submission is implemented and request-tested, but a real question was intentionally not posted. Before an npm release, test one approved end-to-end submission against a dedicated fixture store.
- This component does not add the question count to `StarRatingBadge`; that is a separate enhancement to the existing badge adapter.
- Store-owner answers belong to Judge.me's moderation/admin workflow, not this public shopper component.
- Keep `https://api.judge.me` covered by the consuming app's `connect-src`. The current Hydrogen wildcard `https://*.judge.me` already covers it.
- Never add the private token to question reads, writes, loader data, browser code, fixtures, logs, or ctx.
