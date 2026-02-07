import { useState, useCallback } from "react";
import type { AppScreen, LevelUpChoice } from "./types/game";
import { useGameState } from "./hooks/useGameState";
import { GameView } from "./components/game/GameView";
import { DeathScreen } from "./components/game/DeathScreen";
import { MainMenu } from "./components/menu/MainMenu";
import { HighScores } from "./components/menu/HighScores";
import { RunHistory } from "./components/menu/RunHistory";
import { Settings } from "./components/menu/Settings";

function App() {
  const [screen, setScreen] = useState<AppScreen>("menu");
  const game = useGameState();

  const handleNewGame = useCallback(
    async (seed?: string) => {
      await game.startNewGame(seed);
      setScreen("game");
    },
    [game],
  );

  const handleContinue = useCallback(async () => {
    const loaded = await game.continueGame();
    if (loaded) {
      setScreen("game");
    }
  }, [game]);

  const handleLevelUp = useCallback(
    (choice: LevelUpChoice) => {
      game.levelUpChoice(choice);
    },
    [game],
  );

  const handleEscape = useCallback(async () => {
    await game.saveGame();
    setScreen("menu");
  }, [game]);

  const handleBackToMenu = useCallback(() => setScreen("menu"), []);

  // Detect pending level up from game state
  const pendingLevelUp = game.gameState?.player.xp === 0 && (game.events.some((e) => {
    if (typeof e === "object" && "LevelUp" in e) return true;
    return false;
  }));

  // Check game over
  if (game.gameOver && screen === "game") {
    return (
      <DeathScreen
        info={game.gameOver}
        onNewGame={() => handleNewGame()}
        onMainMenu={handleBackToMenu}
      />
    );
  }

  switch (screen) {
    case "menu":
      return (
        <MainMenu
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onHighScores={() => setScreen("highscores")}
          onRunHistory={() => setScreen("history")}
          onSettings={() => setScreen("settings")}
        />
      );
    case "game":
      if (!game.gameState) return null;
      return (
        <GameView
          gameState={game.gameState}
          gameOver={game.gameOver}
          events={game.events}
          pendingLevelUp={pendingLevelUp ?? false}
          onMove={game.move}
          onWait={game.wait}
          onPickUp={game.pickUp}
          onUseStairs={game.useStairs}
          onUseItem={game.useItem}
          onDropItem={game.dropItem}
          onEquipItem={game.equipItem}
          onLevelUpChoice={handleLevelUp}
          onEscape={handleEscape}
        />
      );
    case "highscores":
      return <HighScores onBack={handleBackToMenu} />;
    case "history":
      return <RunHistory onBack={handleBackToMenu} />;
    case "settings":
      return <Settings onBack={handleBackToMenu} />;
    default:
      return null;
  }
}

export default App;
