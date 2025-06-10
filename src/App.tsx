import React, { useState, useEffect } from "react";
import "./index.css";

const GRID_WIDTH = 9;
const GRID_HEIGHT = 5;

type CaseKey = 'case1' | 'case2' | 'case3' | 'case4';
type ObjectType = { w: number; h: number; totalCount: number; count: number };
type Cell = [number, number];

const CASES: Record<CaseKey, { w: number; h: number; totalCount: number }[]> = {
  case1: [
    { w: 3, h: 2, totalCount: 2 },
    { w: 3, h: 1, totalCount: 5 },
    { w: 2, h: 1, totalCount: 2 }
  ],
  case2: [
    { w: 4, h: 2, totalCount: 1 },
    { w: 1, h: 4, totalCount: 2 },
    { w: 3, h: 1, totalCount: 5 }
  ],
  case3: [
    { w: 3, h: 3, totalCount: 1 },
    { w: 2, h: 2, totalCount: 4 },
    { w: 2, h: 1, totalCount: 3 }
  ],
  case4: [
    { w: 4, h: 2, totalCount: 2 },
    { w: 3, h: 1, totalCount: 3 },
    { w: 2, h: 1, totalCount: 6 }
  ]
};

function calculateProbabilities(
  objects: ObjectType[],
  openedCells: Cell[]
): number[][] {
  const gridWidth = 9;
  const gridHeight = 5;

  // 2차원 배열 0.0 초기화
  let probabilities: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0.0)
  );

  let openedSet = new Set(openedCells.map(([x, y]) => `${y},${x}`));

  function getOrientations(w: number, h: number): { w: number; h: number }[] {
    return w === h ? [{ w, h }] : [{ w, h }, { w: h, h: w }];
  }

  for (let obj of objects) {
    const { w: w0, h: h0, count } = obj;
    if (count <= 0) continue;
    const orientations = getOrientations(w0, h0);
    let placements: { cells: [number, number][] }[] = [];
    let totalPlacements = 0;

    for (let { w, h } of orientations) {
      const maxX = gridWidth - w + 1;
      const maxY = gridHeight - h + 1;
      for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
          let overlapsOpenedEmpty = false;
          outerLoop: for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              const cellY = y + dy;
              const cellX = x + dx;
              if (openedSet.has(`${cellY},${cellX}`)) {
                overlapsOpenedEmpty = true;
                break outerLoop;
              }
            }
          }
          if (!overlapsOpenedEmpty) {
            // 타입을 명확히: [number, number][]
            const cells: [number, number][] = Array.from({ length: h }, (_, dy) =>
              Array.from({ length: w }, (_, dx) => [y + dy, x + dx] as [number, number])
            ).flat();
            placements.push({ cells });
            totalPlacements += 1;
          }
        }
      }
    }

    let cellCounts: Record<string, number> = {};
    for (let placement of placements) {
      for (let [cellY, cellX] of placement.cells) {
        const key = `${cellY},${cellX}`;
        cellCounts[key] = (cellCounts[key] || 0) + 1;
      }
    }

    let f_k: Record<string, number> = {};
    for (let key in cellCounts) {
      f_k[key] = cellCounts[key] / totalPlacements;
    }

    for (let key in f_k) {
      const [cellY, cellX] = key.split(",").map(Number);
      const f = f_k[key];
      const P_k = 1 - Math.pow(1 - f, count);
      probabilities[cellY][cellX] = 1 - (1 - probabilities[cellY][cellX]) * (1 - P_k);
    }
  }

  // 열린 칸은 0 확률
  for (let cell of openedSet) {
    const [cellY, cellX] = cell.split(",").map(Number);
    probabilities[cellY][cellX] = 0.0;
  }

  return probabilities;
}

function App() {
  const [caseKey, setCaseKey] = useState<CaseKey>('case1');
  const [objects, setObjects] = useState<ObjectType[]>(() =>
    CASES["case1"].map(o => ({ ...o, count: o.totalCount }))
  );
  const [foundCounts, setFoundCounts] = useState<number[]>(() =>
    CASES["case1"].map(() => 0)
  );
  const [openedCells, setOpenedCells] = useState<Cell[]>([]);

  useEffect(() => {
    setObjects(CASES[caseKey].map(o => ({ ...o, count: o.totalCount })));
    setFoundCounts(CASES[caseKey].map(() => 0));
    setOpenedCells([]);
  }, [caseKey]);

  useEffect(() => {
    setObjects(prev =>
      prev.map((obj, i) => ({
        ...obj,
        count: Math.max(0, obj.totalCount - foundCounts[i])
      }))
    );
  }, [foundCounts]);

  const probabilities = calculateProbabilities(objects, openedCells);


  // 확률이 높은 순서대로 정렬
  let probabilityList = [];
  for (let y = 0; y < probabilities.length; y++) {
    for (let x = 0; x < probabilities[0].length; x++) {
      const prob = probabilities[y][x];
      if (!openedCells.some(([ox, oy]) => ox === x && oy === y)) {
        probabilityList.push({ x, y, prob });
      }
    }
  }
  probabilityList.sort((a, b) => b.prob - a.prob);

  let highestProbCells = [];
  let secondHighestProbCells = [];
  if (probabilityList.length > 0) {
    const maxProb = probabilityList[0].prob;
    highestProbCells.push(probabilityList[0]);
    let index = 1;
    while (index < probabilityList.length && probabilityList[index].prob === maxProb) {
      highestProbCells.push(probabilityList[index]);
      index++;
    }
    let secondHighestProb = null;
    if (index < probabilityList.length) {
      secondHighestProb = probabilityList[index].prob;
      secondHighestProbCells.push(probabilityList[index]);
      index++;
      while (
        index < probabilityList.length &&
        probabilityList[index].prob === secondHighestProb &&
        secondHighestProbCells.length < 2
      ) {
        secondHighestProbCells.push(probabilityList[index]);
        index++;
      }
    }
  }

  function handleCellClick(x: number, y: number) {
    setOpenedCells(prev => {
      const exists = prev.some(([px, py]) => px === x && py === y);
      if (exists) {
        return prev.filter(([px, py]) => !(px === x && py === y));
      } else {
        return [...prev, [x, y]];
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-2 text-center">히마리식 오욕내강 털기</h1>
        <form className="flex flex-col gap-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">회차 선택</h2>
            <select
              id="caseSelect"
              className="border rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={caseKey}
              onChange={e => setCaseKey(e.target.value as CaseKey)}
            >
              <option value="case1">1, 4 회차</option>
              <option value="case2">2, 5 회차</option>
              <option value="case3">3, 6 회차</option>
              <option value="case4">7 회차 이상</option>
            </select>
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">물건 목록: </span>
              {objects
                .map((obj, i) => `물건 ${i + 1}: ${obj.w}x${obj.h} ${obj.totalCount}개`)
                .join(", ")}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">이미 찾은 물건 개수 입력</h2>
            <div className="flex flex-col gap-2">
              {objects.map((obj, idx) => (
                <label key={idx} className="flex items-center gap-2 text-gray-700">
                  <span className="whitespace-nowrap">
                    물건 {idx + 1} ({obj.w}x{obj.h}, 총 {obj.totalCount}개):
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={obj.totalCount}
                    value={foundCounts[idx]}
                    onChange={e => {
                      const val = Math.max(
                        0,
                        Math.min(obj.totalCount, Number(e.target.value))
                      );
                      setFoundCounts(fcs => fcs.map((v, i) => (i === idx ? val : v)));
                    }}
                    className="w-16 px-2 py-1 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">열린 칸 선택</h2>
            <div
              className={`grid gap-1`}
              style={{
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 2.5rem)`,
                gridAutoRows: "2.5rem"
              }}
            >
              {Array.from({ length: GRID_HEIGHT }).map((_, y) =>
                Array.from({ length: GRID_WIDTH }).map((_, x) => {
                  const opened = openedCells.some(([ox, oy]) => ox === x && oy === y);
                  return (
                    <button
                      key={x + "-" + y}
                      type="button"
                      className={`border rounded-md flex items-center justify-center text-xs font-medium transition
                        ${opened
                          ? "bg-gray-400 border-gray-600 text-white"
                          : "bg-gray-100 border-gray-300 hover:bg-blue-200 text-gray-700"}
                      `}
                      style={{ width: 40, height: 40 }}
                      onClick={e => {
                        e.preventDefault();
                        handleCellClick(x, y);
                      }}
                    />
                  );
                })
              )}
            </div>
          </section>
        </form>
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">확률 결과</h2>
          <div
            className={`grid gap-1`}
            style={{
              gridTemplateColumns: `repeat(${GRID_WIDTH}, 2.5rem)`,
              gridAutoRows: "2.5rem"
            }}
          >
            {Array.from({ length: GRID_HEIGHT }).map((_, y) =>
              Array.from({ length: GRID_WIDTH }).map((_, x) => {
                const prob = probabilities[y][x];
                const opened = openedCells.some(([ox, oy]) => ox === x && oy === y);
                const isHighest = highestProbCells.some(cell => cell.x === x && cell.y === y);
                const isSecondHighest = secondHighestProbCells.some(cell => cell.x === x && cell.y === y);

                let cellClass =
                  opened
                    ? "bg-gray-400 text-white"
                    : isHighest
                      ? "bg-blue-400 text-white font-bold animate-pulse"
                      : isSecondHighest
                        ? "bg-pink-300 text-white font-semibold"
                        : "bg-gray-100 text-gray-800";

                let icon = "";
                if (isHighest) icon = "⭐";
                else if (isSecondHighest) icon = "🔥";

                return (
                  <div
                    key={x + "-" + y}
                    className={`border rounded-md flex flex-col items-center justify-center text-xs transition ${cellClass}`}
                    style={{ width: 40, height: 40, position: "relative" }}
                  >
                    <span className="">{(prob * 100).toFixed(1) + "%"}</span>
                    {icon && (
                      <span className="absolute top-1 right-1 text-lg select-none">{icon}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
      <footer className="mt-8 text-sm text-gray-400 text-center">
        <span>powered by React + TailwindCSS</span>
      </footer>
    </div>
  );
}

export default App;