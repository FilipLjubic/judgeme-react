import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  fetchQuestionsAndAnswersPage,
  submitQuestion as submitQuestionToJudgeMe,
  type QuestionsAndAnswersAnswer,
  type QuestionsAndAnswersData,
  type QuestionsAndAnswersQuestion,
  type SubmitQuestionInput,
} from "./questions-and-answers-api.js";

type QuestionsAndAnswersStyle = CSSProperties &
  Record<`--${string}`, string | number>;

export interface QuestionsAndAnswersProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: QuestionsAndAnswersData;
  /** @deprecated Styles are loaded automatically. */
  includeStyles?: boolean;
  /** Overrides the real POST for tests or a host-owned consent workflow. */
  onSubmitQuestion?: (input: SubmitQuestionInput) => Promise<void>;
  onQuestionSubmitted?: () => void;
}

/**
 * Renders Judge.me product questions and answers with dashboard labels/styles.
 *
 * Judge.me embeds Q&A inside its Review Widget. This native adapter makes that
 * surface independently composable for headless storefronts while preserving
 * the current public read and submit contracts.
 */
export function QuestionsAndAnswers({
  className,
  data,
  includeStyles: _includeStyles,
  onQuestionSubmitted,
  onSubmitQuestion = submitQuestionToJudgeMe,
  style,
  ...sectionProps
}: QuestionsAndAnswersProps) {
  const [questions, setQuestions] = useState(data.page.questions);
  const [currentPage, setCurrentPage] = useState(data.page.currentPage);
  const [totalPages, setTotalPages] = useState(data.page.totalPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const askButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();
  const config = data.config;
  const isPreview = data.page.previewMode === "sample_data";
  const dataKey = `${data.shopDomain}:${data.product.id}:${data.page.previewMode ?? "live"}:${data.page.currentPage}`;
  const widgetStyle = {
    "--jdgm-qna-primary": config.primaryColor,
    "--jdgm-qna-secondary": config.secondaryColor,
    "--jdgm-qna-text": config.textColor,
    "--jdgm-qna-lighter-text": config.lighterTextColor,
    "--jdgm-qna-button": config.buttonColor,
    "--jdgm-qna-button-text": config.buttonTextColor,
    "--jdgm-qna-radius": getCornerRadius(config.cornerStyle),
    "--jdgm-qna-title-size": getTextSize(config.titleTextSize, true),
    "--jdgm-qna-body-size": getTextSize(config.bodyTextSize, false),
    ...style,
  } satisfies QuestionsAndAnswersStyle;

  useEffect(() => {
    setQuestions(data.page.questions);
    setCurrentPage(data.page.currentPage);
    setTotalPages(data.page.totalPages);
    setLoadError("");
  }, [dataKey, data.page.questions, data.page.totalPages]);

  useEffect(() => {
    if (!isFormOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeQuestionForm();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isFormOpen]);

  const uniqueQuestions = useMemo(() => {
    const seen = new Set<string>();
    return questions.filter((item) => {
      const contentKey = `${item.askerName}\u0000${item.createdAt}\u0000${item.content}`;
      if (seen.has(item.uuid) || seen.has(contentKey)) return false;
      seen.add(item.uuid);
      seen.add(contentKey);
      return true;
    });
  }, [questions]);

  function openQuestionForm() {
    setSubmitError("");
    setIsSubmitted(false);
    setIsFormOpen(true);
  }

  function closeQuestionForm() {
    setIsFormOpen(false);
    window.requestAnimationFrame(() => askButtonRef.current?.focus());
  }

  async function loadMoreQuestions() {
    if (isLoadingMore || currentPage >= totalPages) return;

    setIsLoadingMore(true);
    setLoadError("");
    try {
      const nextPage = await fetchQuestionsAndAnswersPage({
        shopDomain: data.shopDomain,
        productId: data.product.id,
        page: currentPage + 1,
        previewMode: data.page.previewMode,
      });
      setQuestions((current) => [...current, ...nextPage.questions]);
      setCurrentPage(nextPage.currentPage);
      setTotalPages(nextPage.totalPages);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load more questions.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (isPreview) {
      setSubmitError("Judge.me sample previews cannot accept questions.");
      return;
    }
    if (!question.trim()) {
      setSubmitError(config.requiredQuestionErrorText);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitQuestion({
        shopDomain: data.shopDomain,
        productId: data.product.id,
        productTitle: data.product.title,
        productHandle: data.product.handle,
        name,
        email,
        question,
      });
      setIsSubmitted(true);
      setName("");
      setEmail("");
      setQuestion("");
      onQuestionSubmitted?.();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to submit your question.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function moveCarousel(direction: "next" | "previous") {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction === "next" ? carousel.clientWidth : -carousel.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <>
      <section
        {...sectionProps}
        className={[
          "jdgm-react-qna",
          `jdgm-react-qna--${config.theme}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={widgetStyle}
        data-dashboard-enabled={String(config.dashboardEnabled)}
        data-preview-mode={data.page.previewMode ?? "false"}
        data-judgeme-react-widget="questions-and-answers"
      >
        <header className="jdgm-react-qna__header">
          <h2>{config.headingText}</h2>
          <button
            ref={askButtonRef}
            type="button"
            className="jdgm-react-qna__primary-button"
            onClick={openQuestionForm}
          >
            {config.askQuestionText}
          </button>
        </header>

        {isPreview ? (
          <p className="jdgm-react-qna__preview-note" role="note">
            Judge.me sample data — preview only. No sample question can be
            submitted.
          </p>
        ) : null}

        {uniqueQuestions.length > 0 ? (
          <div className="jdgm-react-qna__content">
            {config.theme === "carousel" ? (
              <div className="jdgm-react-qna__carousel-controls">
                <button
                  type="button"
                  aria-label="Previous question"
                  onClick={() => moveCarousel("previous")}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Next question"
                  onClick={() => moveCarousel("next")}
                >
                  →
                </button>
              </div>
            ) : null}
            <div
              ref={carouselRef}
              className="jdgm-react-qna__list"
              role="list"
            >
              {uniqueQuestions.map((item) => (
                <QuestionItem
                  key={item.uuid}
                  config={config}
                  question={item}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="jdgm-react-qna__empty">
            <span aria-hidden="true">?</span>
            <p>No {config.questionWordPlural.toLowerCase()} yet.</p>
          </div>
        )}

        {!isPreview && currentPage < totalPages ? (
          <div className="jdgm-react-qna__load-more">
            <button
              type="button"
              className="jdgm-react-qna__secondary-button"
              disabled={isLoadingMore}
              onClick={loadMoreQuestions}
            >
              {isLoadingMore ? "Loading…" : "Load more questions"}
            </button>
          </div>
        ) : null}
        {loadError ? (
          <p className="jdgm-react-qna__error" role="alert">
            {loadError}
          </p>
        ) : null}
      </section>

      {isFormOpen ? (
        <div
          className="jdgm-react-qna__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeQuestionForm();
          }}
        >
          <div
            className="jdgm-react-qna__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            style={widgetStyle}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="jdgm-react-qna__dialog-close"
              aria-label={config.cancelText}
              onClick={closeQuestionForm}
            >
              ×
            </button>
            {isSubmitted ? (
              <div className="jdgm-react-qna__success" role="status">
                <span aria-hidden="true">✓</span>
                <h2 id={dialogTitleId}>{config.submittedTitleText}</h2>
                <p>{config.submittedBodyText}</p>
                <button
                  type="button"
                  className="jdgm-react-qna__primary-button"
                  onClick={closeQuestionForm}
                >
                  {config.cancelText}
                </button>
              </div>
            ) : (
              <form className="jdgm-react-qna__form" onSubmit={handleSubmit}>
                <h2 id={dialogTitleId}>{config.formTitleText}</h2>
                <FormField
                  id={`${dialogTitleId}-question`}
                  label={config.questionLabelText}
                  requiredText={config.requiredText}
                >
                  <textarea
                    id={`${dialogTitleId}-question`}
                    name="question"
                    value={question}
                    maxLength={200}
                    placeholder={config.questionPlaceholderText}
                    required
                    rows={5}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <span className="jdgm-react-qna__character-count">
                    {Array.from(question).length}/200
                  </span>
                </FormField>
                <div className="jdgm-react-qna__form-grid">
                  <FormField
                    id={`${dialogTitleId}-name`}
                    label={config.nameLabelText}
                    requiredText={config.requiredText}
                  >
                    <input
                      id={`${dialogTitleId}-name`}
                      name="name"
                      type="text"
                      value={name}
                      maxLength={100}
                      placeholder={config.namePlaceholderText}
                      autoComplete="name"
                      required
                      onChange={(event) => setName(event.target.value)}
                    />
                  </FormField>
                  <FormField
                    id={`${dialogTitleId}-email`}
                    label={config.emailLabelText}
                    requiredText={config.requiredText}
                  >
                    <input
                      id={`${dialogTitleId}-email`}
                      name="email"
                      type="email"
                      value={email}
                      maxLength={320}
                      placeholder={config.emailPlaceholderText}
                      autoComplete="email"
                      required
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </FormField>
                </div>
                <p className="jdgm-react-qna__privacy">{config.privacyText}</p>
                {isPreview ? (
                  <p className="jdgm-react-qna__preview-note" role="note">
                    Preview mode is read-only.
                  </p>
                ) : null}
                {submitError ? (
                  <p className="jdgm-react-qna__error" role="alert">
                    {submitError}
                  </p>
                ) : null}
                <div className="jdgm-react-qna__form-actions">
                  <button
                    type="button"
                    className="jdgm-react-qna__secondary-button"
                    onClick={closeQuestionForm}
                  >
                    {config.cancelText}
                  </button>
                  <button
                    type="submit"
                    className="jdgm-react-qna__primary-button"
                    disabled={isSubmitting || isPreview}
                  >
                    {isSubmitting ? "Submitting…" : config.submitQuestionText}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <style
        data-judgeme-react-styles="questions-and-answers"
        dangerouslySetInnerHTML={{ __html: QUESTIONS_AND_ANSWERS_CSS }}
      />
    </>
  );
}

function QuestionItem({
  config,
  question,
}: {
  config: QuestionsAndAnswersData["config"];
  question: QuestionsAndAnswersQuestion;
}) {
  const askerName = getDisplayName(
    question.askerName,
    question.askerInitial,
    config,
  );

  return (
    <article
      className="jdgm-react-qna__item"
      role="listitem"
      aria-label={`Question from ${askerName}`}
    >
      <div className="jdgm-react-qna__question">
        <PersonHeader
          initial={question.askerInitial}
          name={askerName}
          date={formatJudgeMeDate(question.createdAt, config.reviewDateFormat)}
        />
        <p className="jdgm-react-qna__question-text">{question.content}</p>
      </div>
      {question.answers.length > 0 ? (
        <div
          className="jdgm-react-qna__answers"
          aria-label={`Answers to: ${question.content}`}
        >
          {question.answers.map((answer) => (
            <AnswerItem key={answer.uuid} answer={answer} config={config} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function AnswerItem({
  answer,
  config,
}: {
  answer: QuestionsAndAnswersAnswer;
  config: QuestionsAndAnswersData["config"];
}) {
  const answererName = getDisplayName(
    answer.answererName,
    answer.answererInitial,
    config,
  );
  const label = config.answerLabelTemplate.replace(
    /\{\{\s*(?:answerer_name|shop_name)\s*\}\}/g,
    answererName,
  );

  return (
    <div className="jdgm-react-qna__answer">
      <div className="jdgm-react-qna__answer-heading">
        <strong>{label}</strong>
        <time dateTime={answer.createdAt}>
          {formatJudgeMeDate(answer.createdAt, config.reviewDateFormat)}
        </time>
      </div>
      <p>{answer.content}</p>
    </div>
  );
}

function PersonHeader({
  date,
  initial,
  name,
}: {
  date: string;
  initial: string;
  name: string;
}) {
  return (
    <div className="jdgm-react-qna__person">
      <span className="jdgm-react-qna__avatar" aria-hidden="true">
        {initial}
      </span>
      <span>
        <strong>{name}</strong>
        <time>{date}</time>
      </span>
    </div>
  );
}

function FormField({
  children,
  id,
  label,
  requiredText,
}: {
  children: React.ReactNode;
  id: string;
  label: string;
  requiredText: string;
}) {
  return (
    <div className="jdgm-react-qna__field">
      <label htmlFor={id}>
        {label} <span>{requiredText}</span>
      </label>
      {children}
    </div>
  );
}

function getDisplayName(
  name: string,
  initial: string,
  config: QuestionsAndAnswersData["config"],
): string {
  if (!name.trim()) return config.anonymousReviewerText;
  return config.reviewerNameAsInitial ? initial : name;
}

function formatJudgeMeDate(value: string, format: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const normalized = format.trim().toLowerCase();

  if (normalized.includes("mmm")) {
    return `${monthNames[month - 1]} ${day}, ${year}`;
  }
  if (normalized.startsWith("dd")) {
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }
  if (normalized.startsWith("yyyy")) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function getCornerRadius(
  cornerStyle: QuestionsAndAnswersData["config"]["cornerStyle"],
): string {
  switch (cornerStyle) {
    case "square":
      return "0px";
    case "soft":
      return "8px";
    case "round":
      return "16px";
    case "extra_round":
      return "28px";
  }
}

function getTextSize(
  size: QuestionsAndAnswersData["config"]["bodyTextSize"],
  title: boolean,
): string {
  if (title) {
    if (size === "large") return "20px";
    if (size === "small") return "15px";
    return "17px";
  }
  if (size === "large") return "17px";
  if (size === "small") return "13px";
  return "15px";
}

const QUESTIONS_AND_ANSWERS_CSS = `
.jdgm-react-qna,
.jdgm-react-qna__dialog {
  color: var(--jdgm-qna-text, #000);
  font-family: inherit;
}
.jdgm-react-qna { width: 100%; }
.jdgm-react-qna__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}
.jdgm-react-qna__header h2,
.jdgm-react-qna__form h2,
.jdgm-react-qna__success h2 { margin: 0; color: var(--jdgm-qna-text, #000); }
.jdgm-react-qna__header h2 { font-size: clamp(24px, 3vw, 32px); line-height: 1.2; }
.jdgm-react-qna__primary-button,
.jdgm-react-qna__secondary-button,
.jdgm-react-qna__carousel-controls button {
  min-height: 44px;
  border-radius: var(--jdgm-qna-radius, 8px);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}
.jdgm-react-qna__primary-button {
  border: 1px solid var(--jdgm-qna-button, #108474);
  background: var(--jdgm-qna-button, #108474);
  color: var(--jdgm-qna-button-text, #fff);
  padding: 10px 24px;
}
.jdgm-react-qna__secondary-button,
.jdgm-react-qna__carousel-controls button {
  border: 1px solid color-mix(in srgb, var(--jdgm-qna-text, #000) 35%, transparent);
  background: #fff;
  color: var(--jdgm-qna-text, #000);
  padding: 10px 20px;
}
.jdgm-react-qna button:disabled,
.jdgm-react-qna__dialog button:disabled { cursor: not-allowed; opacity: .55; }
.jdgm-react-qna button:focus-visible,
.jdgm-react-qna__dialog button:focus-visible,
.jdgm-react-qna__dialog input:focus-visible,
.jdgm-react-qna__dialog textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--jdgm-qna-primary, #108474) 35%, transparent);
  outline-offset: 2px;
}
.jdgm-react-qna__preview-note {
  margin: 0 0 24px;
  border-left: 3px solid var(--jdgm-qna-primary, #108474);
  padding: 9px 12px;
  background: var(--jdgm-qna-secondary, #edf5f5);
  color: var(--jdgm-qna-text, #000);
  font-size: 13px;
  line-height: 1.45;
}
.jdgm-react-qna__list { display: grid; gap: 0; }
.jdgm-react-qna__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, .95fr);
  gap: clamp(24px, 5vw, 64px);
  padding: 32px 0;
  border-top: 1px solid color-mix(in srgb, var(--jdgm-qna-text, #000) 14%, transparent);
}
.jdgm-react-qna__item:last-child {
  border-bottom: 1px solid color-mix(in srgb, var(--jdgm-qna-text, #000) 14%, transparent);
}
.jdgm-react-qna__question,
.jdgm-react-qna__answers,
.jdgm-react-qna__answer { min-width: 0; }
.jdgm-react-qna__person { display: flex; align-items: center; gap: 12px; }
.jdgm-react-qna__person > span:last-child { display: grid; gap: 2px; }
.jdgm-react-qna__person strong,
.jdgm-react-qna__answer-heading strong { font-size: 14px; line-height: 1.35; }
.jdgm-react-qna__person time,
.jdgm-react-qna__answer-heading time {
  color: var(--jdgm-qna-lighter-text, #7b7b7b);
  font-size: 12px;
  line-height: 1.35;
}
.jdgm-react-qna__avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 50%;
  background: var(--jdgm-qna-secondary, #edf5f5);
  color: var(--jdgm-qna-primary, #108474);
  font-size: 15px;
  font-weight: 750;
}
.jdgm-react-qna__question-text {
  margin: 18px 0 0;
  color: var(--jdgm-qna-text, #000);
  font-size: var(--jdgm-qna-title-size, 17px);
  font-weight: 680;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.jdgm-react-qna__answers { display: grid; gap: 20px; }
.jdgm-react-qna__answer {
  border-left: 3px solid var(--jdgm-qna-primary, #108474);
  padding-left: 18px;
}
.jdgm-react-qna__answer-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.jdgm-react-qna__answer p {
  margin: 8px 0 0;
  font-size: var(--jdgm-qna-body-size, 15px);
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.jdgm-react-qna--align .jdgm-react-qna__item { grid-template-columns: minmax(0, 1fr); }
.jdgm-react-qna--align .jdgm-react-qna__answers { margin-left: clamp(24px, 7vw, 96px); }
.jdgm-react-qna--cards .jdgm-react-qna__list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 20px;
}
.jdgm-react-qna--cards .jdgm-react-qna__item {
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--jdgm-qna-text, #000) 14%, transparent);
  border-radius: var(--jdgm-qna-radius, 8px);
  background: color-mix(in srgb, var(--jdgm-qna-secondary, #edf5f5) 45%, #fff);
}
.jdgm-react-qna--carousel .jdgm-react-qna__content { position: relative; }
.jdgm-react-qna--carousel .jdgm-react-qna__list {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.jdgm-react-qna--carousel .jdgm-react-qna__list::-webkit-scrollbar { display: none; }
.jdgm-react-qna--carousel .jdgm-react-qna__item {
  grid-template-columns: minmax(0, 1fr);
  flex: 0 0 min(680px, calc(100% - 40px));
  gap: 24px;
  padding: 28px;
  border: 1px solid color-mix(in srgb, var(--jdgm-qna-text, #000) 14%, transparent);
  border-radius: var(--jdgm-qna-radius, 8px);
  scroll-snap-align: start;
}
.jdgm-react-qna__carousel-controls {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}
.jdgm-react-qna__carousel-controls button { width: 44px; padding: 0; }
.jdgm-react-qna__empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 52px 20px;
  border: 1px dashed color-mix(in srgb, var(--jdgm-qna-text, #000) 22%, transparent);
  border-radius: var(--jdgm-qna-radius, 8px);
  text-align: center;
}
.jdgm-react-qna__empty > span {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--jdgm-qna-secondary, #edf5f5);
  color: var(--jdgm-qna-primary, #108474);
  font-size: 24px;
  font-weight: 750;
}
.jdgm-react-qna__empty p { margin: 0; color: var(--jdgm-qna-lighter-text, #7b7b7b); }
.jdgm-react-qna__load-more { display: flex; justify-content: center; padding-top: 28px; }
.jdgm-react-qna__error { margin: 14px 0 0; color: #b42318; font-size: 14px; }
.jdgm-react-qna__dialog-backdrop {
  position: fixed;
  z-index: 2147483001;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 24px;
  background: rgba(0, 0, 0, .52);
}
.jdgm-react-qna__dialog {
  position: relative;
  width: min(680px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border-radius: var(--jdgm-qna-radius, 8px);
  background: #fff;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .24);
  padding: clamp(24px, 4vw, 40px);
}
.jdgm-react-qna__dialog-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--jdgm-qna-text, #000);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.jdgm-react-qna__form { display: grid; gap: 22px; }
.jdgm-react-qna__form h2 { padding-right: 40px; font-size: 25px; line-height: 1.25; }
.jdgm-react-qna__form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.jdgm-react-qna__field { position: relative; display: grid; gap: 8px; }
.jdgm-react-qna__field label { font-size: 14px; font-weight: 680; }
.jdgm-react-qna__field label span { color: var(--jdgm-qna-lighter-text, #7b7b7b); font-size: 11px; font-weight: 500; }
.jdgm-react-qna__field input,
.jdgm-react-qna__field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--jdgm-qna-text, #000) 28%, transparent);
  border-radius: var(--jdgm-qna-radius, 8px);
  background: #fff;
  color: var(--jdgm-qna-text, #000);
  font: inherit;
  font-size: 15px;
  line-height: 1.45;
  padding: 12px 14px;
}
.jdgm-react-qna__field textarea { resize: vertical; min-height: 130px; padding-bottom: 30px; }
.jdgm-react-qna__character-count {
  position: absolute;
  right: 12px;
  bottom: 10px;
  color: var(--jdgm-qna-lighter-text, #7b7b7b);
  font-size: 11px;
}
.jdgm-react-qna__privacy { margin: 0; color: var(--jdgm-qna-lighter-text, #7b7b7b); font-size: 12px; line-height: 1.55; }
.jdgm-react-qna__form-actions { display: flex; justify-content: flex-end; gap: 12px; }
.jdgm-react-qna__success { display: grid; justify-items: center; gap: 14px; padding: 36px 12px 12px; text-align: center; }
.jdgm-react-qna__success > span {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--jdgm-qna-secondary, #edf5f5);
  color: var(--jdgm-qna-primary, #108474);
  font-size: 28px;
  font-weight: 800;
}
.jdgm-react-qna__success p { margin: 0 0 8px; color: var(--jdgm-qna-lighter-text, #7b7b7b); }
@media (max-width: 720px) {
  .jdgm-react-qna__header { align-items: stretch; flex-direction: column; }
  .jdgm-react-qna__header .jdgm-react-qna__primary-button { width: 100%; }
  .jdgm-react-qna__item { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .jdgm-react-qna--cards .jdgm-react-qna__list { grid-template-columns: minmax(0, 1fr); }
  .jdgm-react-qna__form-grid { grid-template-columns: minmax(0, 1fr); }
  .jdgm-react-qna__dialog-backdrop { padding: 12px; }
  .jdgm-react-qna__dialog { max-height: calc(100vh - 24px); }
  .jdgm-react-qna__form-actions { flex-direction: column-reverse; }
  .jdgm-react-qna__form-actions button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .jdgm-react-qna--carousel .jdgm-react-qna__list { scroll-behavior: auto; }
}
`;
