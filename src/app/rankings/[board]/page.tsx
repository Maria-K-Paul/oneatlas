import type { Metadata } from "next";
import { BOARDS, findBoard } from "@/modules/rankings";
import { BoardView } from "../board-view";

export function generateStaticParams() {
  return BOARDS.filter((board) => board.slug !== "overall").map((board) => ({ board: board.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/rankings/[board]">): Promise<Metadata> {
  const board = findBoard((await params).board);
  return board ? { title: `${board.title} ranking`, description: board.description } : {};
}

export default async function BoardPage({ params }: PageProps<"/rankings/[board]">) {
  return <BoardView slug={(await params).board} />;
}
