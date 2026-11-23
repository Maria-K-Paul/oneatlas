import { notFound } from "next/navigation";
import type { ModelSummary } from "@/modules/catalog";
import { CompareToggle } from "@/modules/compare";
import { BoardNav, Leaderboard } from "@/modules/rankings";
import { getBoard } from "@/modules/rankings/server";
import { PageContainer, PageHeader } from "@/platform/layout";

/** Shared by /rankings (the overall board) and /rankings/[board]. */
export async function BoardView({ slug }: { slug: string }) {
  const result = await getBoard(slug);
  if (!result) notFound();
  const { board, rows } = result;
  const compare = (model: ModelSummary) => <CompareToggle id={model.id} name={model.name} />;

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={board.slug === "overall" ? "Rankings" : `${board.title} ranking`}
        description="Leaderboards computed from the benchmark scores and prices in the catalog. Scores are normalized to 0–100 per benchmark before averaging."
      />
      <BoardNav active={board.slug} />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{board.title}</h2>
        <p className="text-sm text-muted-foreground">{board.description}</p>
      </div>
      <Leaderboard rows={rows} metric={board.metric} kind={board.kind} rowAction={compare} />
      <details className="rounded-xl border p-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          How rankings are calculated
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>
            Each score is normalized to 0–100 on its benchmark&apos;s scale. Percent scores stay as
            they are; Elo ratings are scaled between the lowest and highest rated model.
          </li>
          <li>
            A category index is the average of a model&apos;s normalized scores in that category. A
            model needs results for at least half of the category&apos;s benchmarks to be ranked in
            it.
          </li>
          <li>
            The overall index is the average of a model&apos;s category indexes, for models with at
            least three categories.
          </li>
          <li>
            Best value divides the overall index by the blended price per 1M tokens (3 parts input
            to 1 part output).
          </li>
        </ol>
        <p className="mt-3">
          Only active text models are ranked. Benchmark data is illustrative sample data.
        </p>
      </details>
    </PageContainer>
  );
}
