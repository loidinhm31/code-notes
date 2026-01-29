import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStore } from "@code-notes/ui/store";
import { ProgressBadge } from "@code-notes/ui/components/molecules/ProgressBadge/ProgressBadge";
import { TrendingUp, Target, Clock, Award, ArrowLeft } from "lucide-react";
import { Button } from "@code-notes/ui/components/ui/button";

export const ProgressDashboardPage = () => {
  const navigate = useNavigate();
  const {
    fetchAllProgress,
    fetchStatistics,
    statistics,
    progressLoading,
    getProgressStats,
  } = useStore();

  useEffect(() => {
    fetchAllProgress();
    fetchStatistics();
  }, [fetchAllProgress, fetchStatistics]);

  const stats = getProgressStats();

  if (progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--color-primary)" }}
          />
          <p style={{ color: "var(--color-text-secondary)" }}>
            Loading progress...
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Mastered",
      value: stats.mastered,
      icon: Award,
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.1)",
    },
    {
      label: "Studying",
      value: stats.studying,
      icon: TrendingUp,
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      label: "Needs Review",
      value: stats.needsReview,
      icon: Clock,
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
    {
      label: "Not Studied",
      value: stats.notStudied,
      icon: Target,
      color: "#6B7280",
      bgColor: "rgba(107, 114, 128, 0.1)",
    },
  ];

  const completionPercentage =
    stats.total > 0
      ? Math.round(((stats.mastered + stats.studying) / stats.total) * 100)
      : 0;

  return (
    <div className="min-h-screen-safe circuit-pattern-light dark:circuit-pattern-dark">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <Button asChild className="mb-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Topics
            </Link>
          </Button>
          <div className="mt-4">
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: "var(--color-primary)" }}
            >
              Progress Dashboard
            </h1>
            <p style={{ color: "var(--color-text-muted)" }}>
              Track your learning progress across all topics
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="clay-card p-6"
                style={{
                  backgroundColor: card.bgColor,
                  border: `2px solid ${card.color}`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-8 h-8" style={{ color: card.color }} />
                  <span
                    className="text-3xl font-bold"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </span>
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: card.color }}
                >
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="clay-card p-6 mb-8">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--color-primary)" }}
          >
            Overall Progress
          </h2>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span style={{ color: "var(--color-text-secondary)" }}>
                Completion
              </span>
              <span
                className="font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                {completionPercentage}%
              </span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-bg-muted)" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${completionPercentage}%`,
                  backgroundColor: "var(--color-primary)",
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p
                className="text-sm mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Total Questions
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                {stats.total}
              </p>
            </div>
            {statistics && (
              <>
                <div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Avg Confidence
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {statistics.averageConfidence.toFixed(1)}/5
                  </p>
                </div>
                <div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Reviewed Today
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {statistics.questionsReviewedToday}
                  </p>
                </div>
                <div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Due for Review
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {statistics.questionsDueForReview}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress Breakdown */}
        <div className="clay-card p-6 mb-8">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--color-primary)" }}
          >
            Status Breakdown
          </h2>
          <div className="flex flex-wrap gap-3">
            <ProgressBadge status="Mastered" confidenceLevel={5} />
            <ProgressBadge status="Studying" confidenceLevel={3} />
            <ProgressBadge status="NeedsReview" confidenceLevel={2} />
            <ProgressBadge status="NotStudied" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate("/quiz")}
            className="clay-card p-6 text-left transition-all duration-200 hover:scale-105 h-auto"
            style={{
              backgroundColor: "var(--color-primary)",
              cursor: "pointer",
            }}
          >
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">Start Quiz</h3>
              <p className="text-white opacity-90">
                Test your knowledge with a quiz
              </p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};
