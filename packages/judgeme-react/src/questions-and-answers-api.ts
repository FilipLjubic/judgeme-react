import { normalizeShopDomain } from "./config.js";
import {
  fetchAllReviewsCounter,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";
import { getShopifyNumericId } from "./shopify.js";

const JUDGE_ME_API = "https://api.judge.me";
const QUESTIONS_PATH = "/api/questions/questions_for_widget";
const SUBMIT_QUESTION_PATH = "/api/questions";

export type QuestionsAndAnswersTheme =
  | "align"
  | "cards"
  | "carousel"
  | "standard";
export type QuestionsAndAnswersPreviewMode = "sample_data";

export interface QuestionsAndAnswersConfig {
  /** Mirrors Judge.me's Q&A switch, but does not prevent a headless mount. */
  dashboardEnabled: boolean;
  theme: QuestionsAndAnswersTheme;
  headingText: string;
  questionWordSingular: string;
  questionWordPlural: string;
  askQuestionText: string;
  formTitleText: string;
  questionLabelText: string;
  questionPlaceholderText: string;
  nameLabelText: string;
  namePlaceholderText: string;
  emailLabelText: string;
  emailPlaceholderText: string;
  requiredText: string;
  requiredQuestionErrorText: string;
  privacyText: string;
  submitQuestionText: string;
  cancelText: string;
  submittedTitleText: string;
  submittedBodyText: string;
  answerLabelTemplate: string;
  anonymousReviewerText: string;
  reviewerNameAsInitial: boolean;
  reviewDateFormat: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  lighterTextColor: string;
  buttonColor: string;
  buttonTextColor: string;
  cornerStyle: "extra_round" | "round" | "soft" | "square";
  titleTextSize: "large" | "medium" | "small";
  bodyTextSize: "large" | "medium" | "small";
}

export interface QuestionsAndAnswersAnswer {
  uuid: string;
  content: string;
  createdAt: string;
  shopAsAnswerer: boolean;
  answererName: string;
  answererInitial: string;
}

export interface QuestionsAndAnswersQuestion {
  uuid: string;
  content: string;
  createdAt: string;
  shopAsAsker: boolean;
  askerName: string;
  askerInitial: string;
  answers: readonly QuestionsAndAnswersAnswer[];
}

export interface QuestionsAndAnswersPageData {
  currentPage: number;
  totalPages: number;
  perPage: number;
  previewMode?: QuestionsAndAnswersPreviewMode;
  productId: string;
  questions: readonly QuestionsAndAnswersQuestion[];
}

export interface QuestionsAndAnswersProduct {
  id: string;
  title: string;
  handle: string;
}

export interface QuestionsAndAnswersData {
  config: QuestionsAndAnswersConfig;
  page: QuestionsAndAnswersPageData;
  product: QuestionsAndAnswersProduct;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface FetchQuestionsAndAnswersPageOptions {
  shopDomain: string;
  productId: string;
  page?: number;
  previewMode?: QuestionsAndAnswersPreviewMode;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchQuestionsAndAnswersOptions
  extends FetchQuestionsAndAnswersPageOptions {
  publicToken: string;
  productTitle: string;
  productHandle: string;
}

export interface CreateQuestionsAndAnswersDataOptions {
  page: QuestionsAndAnswersPageData;
  productId: string;
  productTitle: string;
  productHandle: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface SubmitQuestionInput {
  shopDomain: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  name: string;
  email: string;
  question: string;
  shopConsentToken?: string;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

interface QuestionsApiResponse {
  current_page?: unknown;
  per_page?: unknown;
  questions?: unknown;
  total_pages?: unknown;
}

const DEFAULT_CONFIG: QuestionsAndAnswersConfig = {
  dashboardEnabled: false,
  theme: "standard",
  headingText: "Questions & Answers",
  questionWordSingular: "Question",
  questionWordPlural: "Questions",
  askQuestionText: "Ask a question",
  formTitleText: "Ask a question about this product",
  questionLabelText: "Question",
  questionPlaceholderText: "Write your question here",
  nameLabelText: "Display name",
  namePlaceholderText: "Display name",
  emailLabelText: "Email address",
  emailPlaceholderText: "Your email address",
  requiredText: "Required",
  requiredQuestionErrorText: "Please enter your question.",
  privacyText: "We'll only contact you about your question if necessary.",
  submitQuestionText: "Submit Question",
  cancelText: "Cancel",
  submittedTitleText: "Thanks for your question!",
  submittedBodyText:
    "We’ll notify you by email when your question is answered.",
  answerLabelTemplate: "Answer from {{ answerer_name }}:",
  anonymousReviewerText: "Anonymous",
  reviewerNameAsInitial: false,
  reviewDateFormat: "mm/dd/yyyy",
  primaryColor: "#108474",
  secondaryColor: "#edf5f5",
  textColor: "#000000",
  lighterTextColor: "#7b7b7b",
  buttonColor: "#108474",
  buttonTextColor: "#ffffff",
  cornerStyle: "soft",
  titleTextSize: "medium",
  bodyTextSize: "medium",
};

/** Reads one page from Judge.me's current tokenless product-question feed. */
export async function fetchQuestionsAndAnswersPage({
  shopDomain,
  productId,
  page = 1,
  previewMode,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchQuestionsAndAnswersPageOptions): Promise<QuestionsAndAnswersPageData> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedProductId = getShopifyNumericId(productId);
  assertPositiveInteger(page, "question page");

  const url = new URL(QUESTIONS_PATH, JUDGE_ME_API);
  url.searchParams.set("product_id", normalizedProductId);
  url.searchParams.set("page", String(page));
  url.searchParams.set("json_request", "true");
  url.searchParams.set("shop_domain", normalizedShopDomain);
  url.searchParams.set("platform", "shopify");
  if (previewMode) url.searchParams.set("preview_mode", previewMode);

  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me Questions & Answers request failed with HTTP ${response.status}.`,
    );
  }

  let payload: QuestionsApiResponse;
  try {
    payload = (await response.json()) as QuestionsApiResponse;
  } catch {
    throw new Error("Judge.me Questions & Answers returned invalid JSON.");
  }

  return normalizeQuestionsPage(payload, normalizedProductId, previewMode);
}

/** Fetches a standalone Q&A payload with the store's public dashboard settings. */
export async function fetchQuestionsAndAnswers({
  shopDomain,
  publicToken,
  productId,
  productTitle,
  productHandle,
  page,
  previewMode,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchQuestionsAndAnswersOptions): Promise<QuestionsAndAnswersData> {
  const [questionsPage, resources] = await Promise.all([
    fetchQuestionsAndAnswersPage({
      shopDomain,
      productId,
      page,
      previewMode,
      signal,
      fetch: fetchImplementation,
    }),
    fetchAllReviewsCounter({
      shopDomain,
      publicToken,
      signal,
      fetch: fetchImplementation,
    }),
  ]);

  return createQuestionsAndAnswersData({
    page: questionsPage,
    productId,
    productTitle,
    productHandle,
    settings: resources.settings,
    shopDomain,
  });
}

/** Combines Q&A data with settings already fetched by another widget. */
export function createQuestionsAndAnswersData({
  page,
  productId,
  productTitle,
  productHandle,
  settings,
  shopDomain,
}: CreateQuestionsAndAnswersDataOptions): QuestionsAndAnswersData {
  const normalizedProductId = getShopifyNumericId(productId);
  const title = productTitle.trim();
  const handle = normalizeProductHandle(productHandle);

  if (page.productId !== normalizedProductId) {
    throw new Error("Judge.me returned mismatched Questions & Answers data.");
  }
  if (!title) throw new Error("Questions & Answers product title is required.");

  return {
    config: normalizeQuestionsAndAnswersConfig(settings),
    page,
    product: { id: normalizedProductId, title, handle },
    settings,
    shopDomain: normalizeShopDomain(shopDomain),
  };
}

/** Maps Judge.me's shared Review Widget/Q&A settings to a stable React shape. */
export function normalizeQuestionsAndAnswersConfig(
  settings: JudgeMeRuntimeSettings,
): QuestionsAndAnswersConfig {
  const primaryColor = readColorSetting(
    settings.widget_primary_color,
    DEFAULT_CONFIG.primaryColor,
  );

  return {
    dashboardEnabled: readBooleanSetting(
      settings.review_widget_qna_enabled,
      DEFAULT_CONFIG.dashboardEnabled,
    ),
    theme: normalizeTheme(settings.review_widget_reviews_section_theme),
    headingText: readStringSetting(
      settings.widget_questions_and_answers_text,
      DEFAULT_CONFIG.headingText,
    ),
    questionWordSingular: readStringSetting(
      settings.qna_widget_question_word_singular,
      DEFAULT_CONFIG.questionWordSingular,
    ),
    questionWordPlural: readStringSetting(
      settings.qna_widget_question_word_plural,
      DEFAULT_CONFIG.questionWordPlural,
    ),
    askQuestionText: readStringSetting(
      settings.widget_open_question_form_text,
      DEFAULT_CONFIG.askQuestionText,
    ),
    formTitleText: readStringSetting(
      settings.qna_content_screen_title_text,
      DEFAULT_CONFIG.formTitleText,
    ),
    questionLabelText: readStringSetting(
      settings.widget_question_label_text,
      DEFAULT_CONFIG.questionLabelText,
    ),
    questionPlaceholderText: readStringSetting(
      settings.widget_question_placeholder_text,
      DEFAULT_CONFIG.questionPlaceholderText,
    ),
    nameLabelText: readStringSetting(
      settings.widget_name_field_text,
      DEFAULT_CONFIG.nameLabelText,
    ),
    namePlaceholderText: readStringSetting(
      settings.widget_name_placeholder_text,
      DEFAULT_CONFIG.namePlaceholderText,
    ),
    emailLabelText: readStringSetting(
      settings.widget_email_field_text,
      DEFAULT_CONFIG.emailLabelText,
    ),
    emailPlaceholderText: readStringSetting(
      settings.widget_email_placeholder_text,
      DEFAULT_CONFIG.emailPlaceholderText,
    ),
    requiredText: readStringSetting(
      settings.write_review_flow_required_text,
      DEFAULT_CONFIG.requiredText,
    ),
    requiredQuestionErrorText: readStringSetting(
      settings.qna_widget_question_required_field_error_text,
      DEFAULT_CONFIG.requiredQuestionErrorText,
    ),
    privacyText: htmlToPlainText(
      readStringSetting(
        settings.qna_widget_flow_gdpr_statement,
        readStringSetting(
          settings.write_review_flow_privacy_message_text,
          DEFAULT_CONFIG.privacyText,
        ),
      ),
    ),
    submitQuestionText: readStringSetting(
      settings.widget_submit_question_text,
      DEFAULT_CONFIG.submitQuestionText,
    ),
    cancelText: readStringSetting(
      settings.qna_widget_close_form_text_question,
      readStringSetting(
        settings.widget_close_form_text_question,
        DEFAULT_CONFIG.cancelText,
      ),
    ),
    submittedTitleText: readStringSetting(
      settings.qna_widget_question_submitted_text,
      readStringSetting(
        settings.widget_question_submitted_text,
        DEFAULT_CONFIG.submittedTitleText,
      ),
    ),
    submittedBodyText: readStringSetting(
      settings.qna_widget_question_submit_success_text,
      readStringSetting(
        settings.widget_question_submit_success_text,
        DEFAULT_CONFIG.submittedBodyText,
      ),
    ),
    answerLabelTemplate: readStringSetting(
      settings.qna_widget_answer_reply_label,
      readStringSetting(
        settings.widget_replied_text,
        DEFAULT_CONFIG.answerLabelTemplate,
      ),
    ),
    anonymousReviewerText: readStringSetting(
      settings.widget_reviewer_anonymous,
      DEFAULT_CONFIG.anonymousReviewerText,
    ),
    reviewerNameAsInitial: readBooleanSetting(
      settings.widget_reviewer_name_as_initial,
      DEFAULT_CONFIG.reviewerNameAsInitial,
    ),
    reviewDateFormat: readStringSetting(
      settings.review_date_format,
      DEFAULT_CONFIG.reviewDateFormat,
    ),
    primaryColor,
    secondaryColor: readColorSetting(
      settings.widget_secondary_color,
      DEFAULT_CONFIG.secondaryColor,
    ),
    textColor: readColorSetting(
      settings.review_widget_text_color,
      DEFAULT_CONFIG.textColor,
    ),
    lighterTextColor: readColorSetting(
      settings.review_widget_lighter_text_color,
      DEFAULT_CONFIG.lighterTextColor,
    ),
    buttonColor: readColorSetting(
      settings.review_widget_button_color,
      primaryColor,
    ),
    buttonTextColor: readColorSetting(
      settings.review_widget_button_text_color,
      DEFAULT_CONFIG.buttonTextColor,
    ),
    cornerStyle: normalizeCornerStyle(
      settings.review_widget_corner_styling,
    ),
    titleTextSize: normalizeTextSize(
      settings.review_widget_review_title_text_size,
    ),
    bodyTextSize: normalizeTextSize(
      settings.review_widget_review_text_size,
    ),
  };
}

/** Posts a shopper question to Judge.me's current public Q&A form route. */
export async function submitQuestion({
  shopDomain,
  productId,
  productTitle,
  productHandle,
  name,
  email,
  question,
  shopConsentToken,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: SubmitQuestionInput): Promise<void> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedProductId = getShopifyNumericId(productId);
  const normalizedName = normalizeRequiredField(name, 100, "name");
  const normalizedEmail = normalizeRequiredField(email, 320, "email");
  const normalizedQuestion = normalizeRequiredField(question, 200, "question");
  const normalizedProductTitle = normalizeRequiredField(
    productTitle,
    500,
    "product title",
  );
  const normalizedProductHandle = normalizeProductHandle(productHandle);

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error("A valid email address is required.");
  }

  const form = new FormData();
  form.set("name", normalizedName);
  form.set("email", normalizedEmail);
  form.set("question_content", normalizedQuestion);
  form.set("id", normalizedProductId);
  form.set("product_title", normalizedProductTitle);
  form.set("handle", normalizedProductHandle);
  form.set("shop_domain", normalizedShopDomain);
  form.set("platform", "shopify");
  if (shopConsentToken?.trim()) {
    form.set("shop_consent_token", shopConsentToken.trim());
  }

  // Keep this a CORS-simple multipart request. Judge.me currently allows the
  // POST response cross-origin but returns 404 to an OPTIONS preflight.
  const response = await fetchImplementation(
    new URL(SUBMIT_QUESTION_PATH, JUDGE_ME_API),
    {
      method: "POST",
      body: form,
      headers: { Accept: "application/json" },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Judge.me question submission failed with HTTP ${response.status}.`,
    );
  }
}

function normalizeQuestionsPage(
  payload: QuestionsApiResponse,
  productId: string,
  previewMode?: QuestionsAndAnswersPreviewMode,
): QuestionsAndAnswersPageData {
  const currentPage = readPositiveInteger(payload.current_page, "current page");
  const totalPages = readPositiveInteger(payload.total_pages, "total pages");
  const perPage = readPositiveInteger(payload.per_page, "questions per page");

  if (currentPage > totalPages) {
    throw new Error("Judge.me returned an invalid Questions & Answers page.");
  }
  if (!Array.isArray(payload.questions)) {
    throw new Error("Judge.me returned invalid Questions & Answers questions.");
  }

  return {
    currentPage,
    totalPages,
    perPage,
    previewMode,
    productId,
    questions: payload.questions.map(normalizeQuestion),
  };
}

function normalizeQuestion(
  value: unknown,
  index: number,
): QuestionsAndAnswersQuestion {
  if (!isRecord(value)) {
    throw new Error(`Judge.me returned an invalid question at index ${index}.`);
  }
  if (!Array.isArray(value.answers)) {
    throw new Error(`Judge.me returned invalid answers for question ${index}.`);
  }

  return {
    uuid: readRequiredString(value.uuid, `question ${index} UUID`),
    content: htmlToPlainText(
      readRequiredString(value.content_html, `question ${index} content`),
    ),
    createdAt: readIsoDate(value.created_at, `question ${index} date`),
    shopAsAsker: readBoolean(value.shop_as_asker, false),
    askerName: readRequiredString(value.asker_name, `question ${index} asker`),
    askerInitial: readInitial(value.asker_initial, value.asker_name),
    answers: value.answers.map((answer, answerIndex) =>
      normalizeAnswer(answer, index, answerIndex),
    ),
  };
}

function normalizeAnswer(
  value: unknown,
  questionIndex: number,
  answerIndex: number,
): QuestionsAndAnswersAnswer {
  if (!isRecord(value)) {
    throw new Error(
      `Judge.me returned an invalid answer at ${questionIndex}:${answerIndex}.`,
    );
  }

  return {
    uuid: readRequiredString(
      value.uuid,
      `answer ${questionIndex}:${answerIndex} UUID`,
    ),
    content: htmlToPlainText(
      readRequiredString(
        value.content_html,
        `answer ${questionIndex}:${answerIndex} content`,
      ),
    ),
    createdAt: readIsoDate(
      value.created_at,
      `answer ${questionIndex}:${answerIndex} date`,
    ),
    shopAsAnswerer: readBoolean(value.shop_as_answerer, false),
    answererName: readRequiredString(
      value.answerer_name,
      `answer ${questionIndex}:${answerIndex} answerer`,
    ),
    answererInitial: readInitial(value.answerer_initial, value.answerer_name),
  };
}

function normalizeTheme(value: JudgeMeJsonValue | undefined) {
  if (value === "align") return "align";
  if (value === "cards") return "cards";
  if (value === "carousel") return "carousel";
  return "standard";
}

function normalizeCornerStyle(
  value: JudgeMeJsonValue | undefined,
): QuestionsAndAnswersConfig["cornerStyle"] {
  if (
    value === "extra_round" ||
    value === "round" ||
    value === "soft" ||
    value === "square"
  ) {
    return value;
  }
  return DEFAULT_CONFIG.cornerStyle;
}

function normalizeTextSize(
  value: JudgeMeJsonValue | undefined,
): QuestionsAndAnswersConfig["titleTextSize"] {
  if (value === "large" || value === "small") return value;
  return "medium";
}

function readStringSetting(
  value: JudgeMeJsonValue | undefined,
  fallback: string,
): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readColorSetting(
  value: JudgeMeJsonValue | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]{1,80}\)|[a-z]{3,30})$/i.test(
    normalized,
  )
    ? normalized
    : fallback;
}

function readBooleanSetting(
  value: JudgeMeJsonValue | undefined,
  fallback: boolean,
): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string" || value.trim() === "") return fallback;
  return !["0", "false", "no", "off", "disabled"].includes(
    value.trim().toLowerCase(),
  );
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readPositiveInteger(value: unknown, label: string): number {
  const normalized = typeof value === "string" ? Number(value) : value;
  if (
    typeof normalized !== "number" ||
    !Number.isSafeInteger(normalized) ||
    normalized < 1
  ) {
    throw new Error(`Judge.me returned an invalid ${label}.`);
  }
  return normalized;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Judge.me returned an invalid ${label}.`);
  }
  return value.trim();
}

function readIsoDate(value: unknown, label: string): string {
  const normalized = readRequiredString(value, label);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`Judge.me returned an invalid ${label}.`);
  }
  return normalized;
}

function readInitial(value: unknown, fallbackName: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return Array.from(value.trim())[0]?.toUpperCase() ?? "?";
  }
  if (typeof fallbackName === "string" && fallbackName.trim()) {
    return Array.from(fallbackName.trim())[0]?.toUpperCase() ?? "?";
  }
  return "?";
}

function normalizeRequiredField(
  value: string,
  maximumLength: number,
  label: string,
): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  if (Array.from(normalized).length > maximumLength) {
    throw new Error(`${label} must not exceed ${maximumLength} characters.`);
  }
  return normalized;
}

function normalizeProductHandle(value: string): string {
  const normalized = value.trim().replace(/^\/+|\/+$/g, "");
  const handle = normalized.startsWith("products/")
    ? normalized.slice("products/".length)
    : normalized;
  if (!handle || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(handle)) {
    throw new Error("Questions & Answers product handle is invalid.");
  }
  return handle;
}

function htmlToPlainText(value: string): string {
  const withBreaks = value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:div|li|p)>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  return decodeHtmlEntities(withBreaks)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|amp|apos|gt|lt|nbsp|quot);/gi,
    (entity, decimal: string | undefined, hexadecimal: string | undefined) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      switch (entity.toLowerCase()) {
        case "&amp;":
          return "&";
        case "&apos;":
          return "'";
        case "&gt;":
          return ">";
        case "&lt;":
          return "<";
        case "&nbsp;":
          return " ";
        case "&quot;":
          return '"';
        default:
          return entity;
      }
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
