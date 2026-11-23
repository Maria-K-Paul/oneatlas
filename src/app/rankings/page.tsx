import type { Metadata } from "next";
import { BoardView } from "./board-view";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "AI model leaderboards: overall, by category, best value, cheapest, longest context, newest and most available.",
};

export default function RankingsPage() {
  return <BoardView slug="overall" />;
}
