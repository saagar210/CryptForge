import { useState, useCallback, useEffect } from "react";
import type { AppScreen, LevelUpChoice, PlayerClass, Settings as SettingsType } from "./types/game";
import { useGameState } from "./hooks/useGameState";
import { getSettings, getDailyStatus, startDailyChallenge } from "./lib/api";
import { GameView } from "./components/game/GameView";
import { DeathScreen } from "./components/game/DeathScreen";
import { MainMenu } from "./components/menu/MainMenu";
import { HighScores } from "./components/menu/HighScores";
import { RunHistory } from "./components/menu/RunHistory";
import { Settings } from "./components/menu/Settings";
import { Achievements } from "./components/menu/Achievements";
import { ClassSelect } from "./components/menu/ClassSelect";
import { Statistics } from "./components/menu/Statistics";

function App() {
  const [screen, setScreen] = useState<AppScreen>("menu");
  const game = useGameState();
  const [audioSettings, setAudioSettings] = useState({ master: 80, sfx: 80, ambient: 50 });

  // Load audio settings from backend
  useEffect(() => {
    getSettings()
      .then((s: SettingsType) => {
        setAudioSettings({
          master: s.master_volume,
          sfx: s.sfx_volume,
          ambient: s.ambient_volume,
        });
      })
      .catch(() => {});
  }, []);

  const handleNewGame = useCallback(
    () => {
      setScreen("classSelect");
    },
    [],
  );

  const handleClassSelected = useCallback(
    async (playerClass: PlayerClass, modifiers: string[]) => {
      await game.startNewGame(undefined, playerClass, modifiers);
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

  const handleDailyChallenge = useCallback(async () => {
    try {
      const status = await getDailyStatus();
      if (status.played) {
        alert(`Already played today's daily challenge! Score: ${status.score ?? 0}, Floor: ${status.floor_reached ?? 0}`);
        return;
      }
      const result = await startDailyChallenge();
      game.handleResult(result);
      setScreen("game");
    } catch (err) {
      alert(String(err));
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

  const handleBackToMenu = useCallback(() => {
    // Reload settings in case user changed them
    getSettings()
      .then((s: SettingsType) => {
        setAudioSettings({
          master: s.master_volume,
          sfx: s.sfx_volume,
          ambient: s.ambient_volume,
        });
      })
      .catch(() => {});
    setScreen("menu");
  }, []);

  const pendingLevelUp = game.gameState?.pending_level_up ?? false;

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
          onDailyChallenge={handleDailyChallenge}
          onHighScores={() => setScreen("highscores")}
          onRunHistory={() => setScreen("history")}
          onAchievements={() => setScreen("achievements")}
          onStatistics={() => setScreen("statistics")}
          onSettings={() => setScreen("settings")}
        />
      );
    case "classSelect":
      return (
        <ClassSelect
          onSelectClass={handleClassSelected}
          onBack={handleBackToMenu}
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
          masterVolume={audioSettings.master}
          sfxVolume={audioSettings.sfx}
          ambientVolume={audioSettings.ambient}
          onMove={game.move}
          onWait={game.wait}
          onPickUp={game.pickUp}
          onUseStairs={game.useStairs}
          onUseItem={game.useItem}
          onDropItem={game.dropItem}
          onEquipItem={game.equipItem}
          onLevelUpChoice={handleLevelUp}
          onEscape={handleEscape}
          onClickMove={game.clickMove}
          onAutoExplore={game.startAutoExplore}
          onCancelAutoExplore={game.cancelAutoExplore}
          onRangedAttack={game.rangedAttack}
          onInteract={game.interact}
          onBuyItem={game.buyItem}
          onSellItem={game.sellItem}
          onUseAbility={game.useAbility}
          onCraftItem={game.craftItem}
        />
      );
    case "highscores":
      return <HighScores onBack={handleBackToMenu} />;
    case "history":
      return <RunHistory onBack={handleBackToMenu} />;
    case "settings":
      return <Settings onBack={handleBackToMenu} />;
    case "achievements":
      return <Achievements onBack={handleBackToMenu} />;
    case "statistics":
      return <Statistics onBack={handleBackToMenu} />;
    default:
      return null;
  }
}

export default App;
