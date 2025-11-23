"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AgentSettings,
  AutomationRule,
  GeneratedReply,
  MetaMediaComment,
  MetaMessage,
  Platform,
} from "@/lib/types";

type Credentials = {
  accessToken: string;
  pageId: string;
  instagramBusinessId: string;
};

const defaultRules: AutomationRule[] = [
  {
    id: "rule-sales",
    label: "Sales Inquiry",
    keywords: ["price", "cost", "quote", "rate"],
    responseTemplate:
      "Thanks for reaching out {{name}}! Our team will send detailed pricing within the hour.",
    platforms: ["facebook", "instagram"],
    priority: 0.9,
  },
  {
    id: "rule-support",
    label: "Support Request",
    keywords: ["issue", "problem", "broken", "help", "support"],
    responseTemplate:
      "Sorry to hear you're having trouble {{name}}. Could you DM us your email so we can follow up privately?",
    platforms: ["facebook"],
    priority: 0.8,
  },
  {
    id: "rule-compliment",
    label: "Positive Feedback",
    keywords: ["love", "awesome", "great", "amazing", "thank"],
    responseTemplate:
      "We appreciate the love {{name}}! Your support keeps us building great things.",
    platforms: ["instagram"],
    priority: 0.6,
  },
];

const defaultSettings: AgentSettings = {
  defaultResponse:
    "Thanks for reaching out! We'll review this and get back to you shortly.",
  tone: "friendly",
  enableSmartReplies: true,
};

const storageKey = "agentic-meta-agent";

export default function Home() {
  const [credentials, setCredentials] = useState<Credentials>({
    accessToken: "",
    pageId: "",
    instagramBusinessId: "",
  });
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [settings, setSettings] = useState<AgentSettings>(defaultSettings);
  const [incomingSample, setIncomingSample] = useState("");
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform>("facebook");
  const [threadType, setThreadType] = useState<"comment" | "direct">("direct");
  const [generatedReply, setGeneratedReply] = useState<GeneratedReply | null>(
    null
  );
  const [messages, setMessages] = useState<MetaMessage[]>([]);
  const [comments, setComments] = useState<MetaMediaComment[]>([]);
  const [isFetchingInbox, setIsFetchingInbox] = useState(false);
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(storageKey)
        : null;

    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (parsed.credentials) {
        setCredentials((prev) => ({
          ...prev,
          ...parsed.credentials,
        }));
      }
      if (parsed.rules) {
        setRules(parsed.rules);
      }
      if (parsed.settings) {
        setSettings(parsed.settings);
      }
    } catch (error) {
      console.error("Failed to parse stored configuration", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ credentials, rules, settings });
    localStorage.setItem(storageKey, payload);
  }, [credentials, rules, settings]);

  const handleCredentialsChange = <K extends keyof Credentials>(
    key: K,
    value: Credentials[K]
  ) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const updateRule = (id: string, patch: Partial<AutomationRule>) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    );
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "New Rule",
        keywords: [],
        responseTemplate: settings.defaultResponse,
        platforms: ["facebook", "instagram"],
        priority: 0.5,
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleGenerateReply = async (text: string) => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/agent/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingText: text,
          context: {
            platform: selectedPlatform,
            threadType,
          },
          settings,
          rules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate reply");
      }

      setGeneratedReply(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      setStatusMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchInbox = async () => {
    if (!credentials.accessToken || !credentials.pageId) {
      setStatusMessage(
        "Access token and Facebook Page ID are required to fetch inbox."
      );
      return;
    }
    setIsFetchingInbox(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/meta/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: credentials.accessToken,
          pageId: credentials.pageId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to load inbox. Check your permissions and token scope."
        );
      }
      setMessages(data.messages ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      setStatusMessage(message);
    } finally {
      setIsFetchingInbox(false);
    }
  };

  const fetchInstagram = async () => {
    if (!credentials.accessToken || !credentials.instagramBusinessId) {
      setStatusMessage(
        "Access token and Instagram Business Account ID are required to fetch comments."
      );
      return;
    }
    setIsFetchingComments(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/meta/instagram/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: credentials.accessToken,
          instagramBusinessId: credentials.instagramBusinessId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to load Instagram comments. Check your permissions."
        );
      }
      setComments(data.comments ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      setStatusMessage(message);
    } finally {
      setIsFetchingComments(false);
    }
  };

  const sendReply = async (
    targetId: string,
    message: string,
    platform: Platform,
    isComment?: boolean
  ) => {
    setStatusMessage(null);
    try {
      const response = await fetch("/api/meta/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          platform,
          message,
          accessToken: credentials.accessToken,
          isComment,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to post reply. Verify your token has the correct permissions."
        );
      }
      setStatusMessage("Reply sent successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      setStatusMessage(message);
    }
  };

  const inboxSummary = useMemo(() => {
    if (!messages.length) return "No messages pulled yet.";
    const latest = messages[0];
    return `Last message from ${latest.fromName} at ${new Date(
      latest.createdTime
    ).toLocaleString()}`;
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Meta Inbox Agent
            </h1>
            <p className="text-sm text-slate-300">
              Automated responses for Facebook Pages and Instagram Business
              accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-600/10 px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Agent Ready
            </span>
            <span className="hidden sm:block">{inboxSummary}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[340px_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold text-white">Meta Credentials</h2>
            <p className="mt-1 text-sm text-slate-300">
              Use a long-lived Page access token with the required permissions.
            </p>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Page Access Token</span>
                <input
                  type="password"
                  value={credentials.accessToken}
                  onChange={(event) =>
                    handleCredentialsChange("accessToken", event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="EAABsb..."
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Facebook Page ID</span>
                <input
                  type="text"
                  value={credentials.pageId}
                  onChange={(event) =>
                    handleCredentialsChange("pageId", event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="1234567890"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">
                  Instagram Business Account ID
                </span>
                <input
                  type="text"
                  value={credentials.instagramBusinessId}
                  onChange={(event) =>
                    handleCredentialsChange(
                      "instagramBusinessId",
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="178414..."
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={fetchInbox}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
                disabled={isFetchingInbox}
              >
                {isFetchingInbox ? "Loading..." : "Fetch Facebook Inbox"}
              </button>
              <button
                onClick={fetchInstagram}
                className="flex-1 rounded-lg border border-emerald-500/40 bg-black/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:text-emerald-400/60"
                disabled={isFetchingComments}
              >
                {isFetchingComments ? "Loading..." : "Fetch Instagram Comments"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold text-white">Agent Behaviour</h2>
            <div className="mt-4 space-y-4 text-sm">
              <label className="block">
                <span className="mb-1 block text-slate-300">
                  Default Response Template
                </span>
                <textarea
                  value={settings.defaultResponse}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultResponse: event.target.value,
                    }))
                  }
                  className="min-h-[90px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-slate-300">Tone</span>
                <select
                  value={settings.tone}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      tone: event.target.value as AgentSettings["tone"],
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="short">Short & Direct</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={settings.enableSmartReplies}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      enableSmartReplies: event.target.checked,
                    }))
                  }
                  className="size-4 accent-emerald-500"
                />
                <span className="text-slate-200">
                  Enable smart reply enhancements
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Automation Rules</h2>
                <p className="text-sm text-slate-300">
                  Match keywords to predefined responses for each platform.
                </p>
              </div>
              <button
                onClick={addRule}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              >
                Add Rule
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <input
                          type="text"
                          value={rule.label}
                          onChange={(event) =>
                            updateRule(rule.id, {
                              label: event.target.value,
                            })
                          }
                          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">Priority</span>
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={1}
                            value={rule.priority}
                            onChange={(event) =>
                              updateRule(rule.id, {
                                priority: Number(event.target.value),
                              })
                            }
                            className="w-20 rounded border border-white/10 bg-black/60 px-2 py-1 text-right text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-slate-300">
                          Keywords (comma separated)
                        </span>
                        <input
                          type="text"
                          value={rule.keywords.join(", ")}
                          onChange={(event) =>
                            updateRule(rule.id, {
                              keywords: event.target.value
                                .split(",")
                                .map((keyword) => keyword.trim())
                                .filter(Boolean),
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-slate-300">
                          Response Template
                        </span>
                        <textarea
                          value={rule.responseTemplate}
                          onChange={(event) =>
                            updateRule(rule.id, {
                              responseTemplate: event.target.value,
                            })
                          }
                          className="min-h-[80px] w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        <label className="flex items-center gap-2 rounded border border-white/10 bg-black/60 px-3 py-1">
                          <input
                            type="checkbox"
                            checked={rule.platforms.includes("facebook")}
                            onChange={(event) =>
                              updateRule(rule.id, {
                                platforms: event.target.checked
                                  ? Array.from(
                                      new Set([
                                        ...rule.platforms,
                                        "facebook",
                                      ])
                                    )
                                  : rule.platforms.filter(
                                      (platform) => platform !== "facebook"
                                    ),
                              })
                            }
                            className="size-4 accent-emerald-500"
                          />
                          Facebook
                        </label>
                        <label className="flex items-center gap-2 rounded border border-white/10 bg-black/60 px-3 py-1">
                          <input
                            type="checkbox"
                            checked={rule.platforms.includes("instagram")}
                            onChange={(event) =>
                              updateRule(rule.id, {
                                platforms: event.target.checked
                                  ? Array.from(
                                      new Set([
                                        ...rule.platforms,
                                        "instagram",
                                      ])
                                    )
                                  : rule.platforms.filter(
                                      (platform) => platform !== "instagram"
                                    ),
                              })
                            }
                            className="size-4 accent-emerald-500"
                          />
                          Instagram
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Facebook Inbox</h2>
                <span className="text-xs text-slate-400">
                  {messages.length} messages
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Pull the latest Page conversations to review the agent suggestions.
                  </p>
                )}
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className="rounded-xl border border-white/5 bg-black/30 p-3 text-sm text-slate-200"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{message.fromName}</span>
                      <time>{new Date(message.createdTime).toLocaleString()}</time>
                    </div>
                    <p className="mt-2 font-medium text-white">{message.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        onClick={() => {
                          setSelectedPlatform("facebook");
                          setThreadType("direct");
                          handleGenerateReply(message.message);
                        }}
                        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                      >
                        Run Agent
                      </button>
                      {generatedReply?.message && (
                        <button
                          onClick={() =>
                            sendReply(
                              message.id,
                              generatedReply.message,
                              "facebook",
                              false
                            )
                          }
                          className="rounded-md border border-emerald-500/60 bg-emerald-500 px-3 py-1 font-medium text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
                          disabled={!credentials.accessToken}
                        >
                          Send Auto-Reply
                        </button>
                      )}
                      {message.link && (
                        <a
                          href={message.link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-white/10 px-3 py-1 text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
                        >
                          Open Thread
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Instagram Comments</h2>
                <span className="text-xs text-slate-400">
                  {comments.length} comments
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {comments.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Fetch comments from connected media to triage replies.
                  </p>
                )}
                {comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-xl border border-white/5 bg-black/30 p-3 text-sm text-slate-200"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>@{comment.username}</span>
                      <time>{new Date(comment.timestamp).toLocaleString()}</time>
                    </div>
                    <p className="mt-2 font-medium text-white">{comment.text}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        onClick={() => {
                          setSelectedPlatform("instagram");
                          setThreadType("comment");
                          handleGenerateReply(comment.text);
                        }}
                        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                      >
                        Run Agent
                      </button>
                      {generatedReply?.message && (
                        <button
                          onClick={() =>
                            sendReply(
                              comment.id,
                              generatedReply.message,
                              "instagram",
                              true
                            )
                          }
                          className="rounded-md border border-emerald-500/60 bg-emerald-500 px-3 py-1 font-medium text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
                          disabled={!credentials.accessToken}
                        >
                          Reply on Instagram
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold text-white">Manual Test Bench</h2>
            <p className="text-sm text-slate-300">
              Paste any message or comment to preview the agent&apos;s reply.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1 block text-slate-300">Platform</span>
                  <select
                    value={selectedPlatform}
                    onChange={(event) =>
                      setSelectedPlatform(event.target.value as Platform)
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-slate-300">Thread Type</span>
                  <select
                    value={threadType}
                    onChange={(event) =>
                      setThreadType(event.target.value as "comment" | "direct")
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="direct">Direct Message</option>
                    <option value="comment">Public Comment</option>
                  </select>
                </label>
              </div>
              <div className="space-y-3">
                <textarea
                  value={incomingSample}
                  onChange={(event) => setIncomingSample(event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="Paste a sample message or comment..."
                />
                <button
                  onClick={() => handleGenerateReply(incomingSample)}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate Reply"}
                </button>
              </div>
            </div>

            {generatedReply && (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-emerald-300">
                  <span>Agent Reply</span>
                  <span>
                    Confidence: {(generatedReply.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-base text-white">
                  {generatedReply.message}
                </p>
                {generatedReply.ruleMatched && (
                  <p className="mt-2 text-xs text-emerald-300">
                    Triggered Rule: {generatedReply.ruleMatched.label}
                  </p>
                )}
              </div>
            )}
          </div>

          {statusMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {statusMessage}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
