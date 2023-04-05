import "./style.css";
import { UI } from "@peasy-lib/peasy-ui";
import { Assets } from "@peasy-lib/peasy-assets";
import { Input } from "@peasy-lib/peasy-input";
import { Chance } from "chance";
import { Pathfinder, Graph, GridNode } from "./components/astar";
let debugFlag = true;
document.addEventListener("keypress", () => {
  console.clear();
  debugFlag = !debugFlag;
});

let chance = new Chance();

enum tiletype {
  straight = "straight",
  cross = "cross",
  elbow = "elbow",
  dblElbow = "dblElbow",
}

const animationFrameDims = {
  small: {
    size: "560px",
    tilesize: "56px",
    frames: ["0", "-56", "-112", "-168", "-224", "-280", "-336", "-392", "-448", "-504"],
  },
  medium: {
    size: "720px",
    tilesize: "72px",
    frames: ["0", "-72", "-144", "-216", "-288", "-360", "-432", "-504", "-576", "-648"],
  },
  large: {
    size: "980px",
    tilesize: "98px",
    frames: ["0", "-98", "-196", "-294", "-392", "-490", "-588", "-686", "-784", "-882"],
  },
};

const model = {
  launch: (event: any, model: any) => {
    model.seed = Math.random() * Date.now();
    chance = new Chance(model.seed);
    //chance = new Chance(978215731746.3297);

    switch (model.level) {
      case "easy":
        model.hotwire.appwidth = 600;
        model.hotwire.numOfTargets = 9;
        model.hotwire.timeremaining = 20;
        break;
      case "med":
        model.hotwire.appwidth = 600;
        model.hotwire.numOfTargets = 16;
        model.hotwire.timeremaining = 15;
        break;
      case "hard":
        model.hotwire.appwidth = 600;
        model.hotwire.numOfTargets = 25;
        model.hotwire.timeremaining = 10;
        break;
    }
    model.result = "PENDING";
    model.hotwire.victoryStatus = "PENDING";
    model.hotwire.isVisible = !model.hotwire.isVisible;
    model.hotwire.squares = [];
    if (model.hotwire.isVisible) {
      model.hotwire.initFlag = true;
      setTimeout(() => {
        model.hotwire.onLoad(model);
      }, 375);
    } else {
      model.hotwire.timeIsRunning = false;
      model.hotwire.victoryStatus = "CANCELLED";
      model.result = "CANCELLED";
      model.hotwire.showFinalModal = false;

      if (model.hotwire.energizeHandler != 0) clearInterval(model.hotwire.energizeHandler);
      if (model.hotwire.timeHandler) clearInterval(model.hotwire.timeHandler);
      model.hotwire.energizeHandler = 0;
      model.hotwire.timeHandler = 0;
    }
  },
  level: "easy",
  result: "waiting",
  seed: <any>undefined,
  hotwire: {
    numOfTargets: 0,
    squares: <any>[],
    startingSquare: 0,
    stoppingSquare: 0,
    stopOrientation: <any>"",
    startingSquareCoords: { x: 0, y: 0 },
    stoppingSquareCoords: { x: 0, y: 0 },
    isVisible: false,
    initFlag: true,
    victoryStatus: "CANCELLED",
    onLoad: () => {
      //set defaults

      model.hotwire.isHelpVisible = false;
      model.hotwire.showFinalModal = false;
      model.hotwire.timeIsRunning = false;
      //start the game timer
      //reset game timer if already instanced
      if (model.hotwire.timeHandler != 0) {
        clearInterval(model.hotwire.timeHandler);
        model.hotwire.timeHandler = 0;
      }
      checkTime();

      //add squares
      model.hotwire.squares = [];

      for (let index = 0; index < model.hotwire.numOfTargets; index++) {
        let tile = chance.pickone(["tiletype_straight", "tiletype_elbow", "tiletype_cross", "tiletype_dblelbow"]);
        let tilesize = "";
        let width = Math.sqrt(model.hotwire.numOfTargets);
        if (model.hotwire.numOfTargets == 9) tilesize = "tilesize_lrg";
        else if (model.hotwire.numOfTargets == 16) tilesize = "tilesize_med";
        else tilesize = "tilesize_small";
        model.hotwire.squares.push({
          id: index,
          wall: 1,
          angle: chance.pickone([0, 90, -90, 180]),
          tilesize: tilesize,
          tiletype: tile,
          get connectionPoints() {
            return getConnectionPoints(this.id);
          },
          energizedDirections: [],
          startingIndex: false,
          stoppingIndex: false,
          energized: false,
          energizedAngle: 0,
          energizetype: getEnergizeImage(tile),
          energizetilesize: getTileSize(tilesize),
          energizeFramesize: getEnergizeSize(tilesize),
          get energizeFrame() {
            return getAnimationFrame(tilesize);
          },
        });
      }
      let width = Math.sqrt(model.hotwire.numOfTargets);

      let stoppingIndex: number, startingIndex: number, stopside: any;
      //let's find start.stop square indexes
      if (model.hotwire.squares.length == 9) {
        //small grid
        startingIndex = chance.pickone([0, 3, 6]);
        if (startingIndex == 0) {
          stoppingIndex = chance.pickone([2, 5, 8]);
          model.hotwire.startingSquareCoords = { x: -25, y: 50 };
        } else if (startingIndex == 3) {
          stoppingIndex = chance.pickone([2, 5, 8]);
          model.hotwire.startingSquareCoords = { x: -25, y: 155 };
        } else {
          stoppingIndex = chance.pickone([2, 5, 8]);
          model.hotwire.startingSquareCoords = { x: -25, y: 260 };
        }
        if (stoppingIndex == 2) model.hotwire.stoppingSquareCoords = { x: 330, y: 50 };
        else if (stoppingIndex == 5) model.hotwire.stoppingSquareCoords = { x: 330, y: 155 };
        else model.hotwire.stoppingSquareCoords = { x: 330, y: 260 };
        stopside = "right";
      } else if (model.hotwire.squares.length == 16) {
        startingIndex = chance.pickone([0, 4, 8, 12]);
        if (startingIndex == 0) {
          stoppingIndex = chance.pickone([7, 11, 15, 14]);
          model.hotwire.startingSquareCoords = { x: -25, y: 38 };
        } else if (startingIndex == 4) {
          stoppingIndex = chance.pickone([3, 11, 15, 14]);
          model.hotwire.startingSquareCoords = { x: -25, y: 118 };
        } else if (startingIndex == 8) {
          stoppingIndex = chance.pickone([2, 3, 11, 15]);
          model.hotwire.startingSquareCoords = { x: -25, y: 196 };
        } else {
          stoppingIndex = chance.pickone([2, 3, 7, 11]);
          model.hotwire.startingSquareCoords = { x: -25, y: 275 };
        }

        if (stoppingIndex == 2) {
          stopside = "top";
          model.hotwire.stoppingSquareCoords = { x: 187, y: -10 };
        } else if (stoppingIndex == 3) {
          stopside = chance.pickone(["top", "right"]);
          if (stopside == "top") model.hotwire.stoppingSquareCoords = { x: 265, y: -10 };
          else model.hotwire.stoppingSquareCoords = { x: 330, y: 38 };
        } else if (stoppingIndex == 7 || stoppingIndex == 11) {
          stopside = "right";
          if (stoppingIndex == 7) model.hotwire.stoppingSquareCoords = { x: 330, y: 118 };
          else model.hotwire.stoppingSquareCoords = { x: 330, y: 195 };
        } else if (stoppingIndex == 15) {
          stopside = chance.pickone(["bottom", "right"]);
          if (stopside == "bottom") model.hotwire.stoppingSquareCoords = { x: 265, y: 315 };
          else model.hotwire.stoppingSquareCoords = { x: 330, y: 275 };
        } else if (stoppingIndex == 14) {
          stopside = "bottom";
          model.hotwire.stoppingSquareCoords = { x: 187, y: 315 };
        }
      } else {
        startingIndex = chance.pickone([0, 5, 10, 15, 20]);
        if (startingIndex == 0) {
          stoppingIndex = chance.pickone([4, 9, 14, 19, 24, 23, 22]);
          model.hotwire.startingSquareCoords = { x: -25, y: 30 };
        } else if (startingIndex == 5) {
          stoppingIndex = chance.pickone([3, 4, 9, 14, 19, 24, 23, 22]);
          model.hotwire.startingSquareCoords = { x: -25, y: 93 };
        } else if (startingIndex == 10) {
          stoppingIndex = chance.pickone([2, 3, 4, 9, 14, 19, 24, 23, 22]);
          model.hotwire.startingSquareCoords = { x: -25, y: 155 };
        } else if (startingIndex == 15) {
          stoppingIndex = chance.pickone([2, 3, 4, 9, 14, 19, 24, 23]);
          model.hotwire.startingSquareCoords = { x: -25, y: 218 };
        } else {
          stoppingIndex = chance.pickone([1, 2, 3, 4, 9, 14, 19, 24]);
          model.hotwire.startingSquareCoords = { x: -25, y: 280 };
        }

        if (stoppingIndex == 1 || stoppingIndex == 2 || stoppingIndex == 3) {
          stopside = "top";
          if (stoppingIndex == 1) model.hotwire.stoppingSquareCoords = { x: 97, y: -10 };
          else if (stoppingIndex == 2) model.hotwire.stoppingSquareCoords = { x: 147, y: -10 };
          else model.hotwire.stoppingSquareCoords = { x: 210, y: -10 };
        } else if (stoppingIndex == 4) {
          stopside = chance.pickone(["top", "right"]);
          if (stopside == "top") model.hotwire.stoppingSquareCoords = { x: 270, y: -10 };
          else model.hotwire.stoppingSquareCoords = { x: 330, y: 30 };
        } else if (stoppingIndex == 9 || stoppingIndex == 14 || stoppingIndex == 19) {
          stopside = "right";
          if (stoppingIndex == 9) model.hotwire.stoppingSquareCoords = { x: 330, y: 93 };
          else if (stoppingIndex == 14) model.hotwire.stoppingSquareCoords = { x: 330, y: 155 };
          else model.hotwire.stoppingSquareCoords = { x: 330, y: 218 };
        } else if (stoppingIndex == 24) {
          stopside = chance.pickone(["bottom", "right"]);
          if (stopside == "bottom") model.hotwire.stoppingSquareCoords = { x: 270, y: 315 };
          else model.hotwire.stoppingSquareCoords = { x: 330, y: 280 };
        } else if (stoppingIndex == 21 || stoppingIndex == 22 || stoppingIndex == 23) {
          stopside = "bottom";
          if (stoppingIndex == 21) model.hotwire.stoppingSquareCoords = { x: 97, y: 315 };
          else if (stoppingIndex == 22) model.hotwire.stoppingSquareCoords = { x: 147, y: 315 };
          else model.hotwire.stoppingSquareCoords = { x: 210, y: 315 };
        }
      }
      model.hotwire.startingSquare = startingIndex;
      model.hotwire.squares[startingIndex].startingIndex = true;
      model.hotwire.stoppingSquare = stoppingIndex;
      model.hotwire.stopOrientation = stopside;
      model.hotwire.squares[stoppingIndex].stoppingIndex = true;

      //setup pathfinding solution
      //pick walls 3x3 = 2, 4x4 = 3, 5,5 = 4
      let wallcount;

      if (model.hotwire.numOfTargets == 9) wallcount = 2;
      else if (model.hotwire.numOfTargets == 16) wallcount = 3;
      else wallcount = 5;
      //setup array of square indexes to choose, the removes start and stop indexes, they can't be walls

      let resultArray = [];
      let testcnt = 0;
      do {
        //clean walls every iteration
        model.hotwire.squares.forEach((sq: any) => {
          sq.wall = 1;
        });

        let filteredArray = model.hotwire.squares.filter((sq: any, sqindx: number) => {
          return sqindx != startingIndex && sqindx != stoppingIndex;
        });

        let wallindexes = chance.pickset(filteredArray, wallcount);

        for (let wallindex in wallindexes) {
          let wlIndex: any = wallindexes[wallindex];
          if (Object.hasOwn(wlIndex, "wall")) {
            wlIndex.wall = 0;
          }
        }
        resultArray = getPath(model.hotwire.squares, width, startingIndex, stoppingIndex);
        testcnt++;
        if (testcnt >= 20) break;
      } while (resultArray.length == 0);

      //based on solution path, update array tile types to make solution work

      let startx = startingIndex % width;
      let starty = Math.floor(startingIndex / width);
      let currentCoords = { x: startx, y: starty };
      let currentDirection = "left";
      //Loop through solution
      resultArray.forEach((tile: any): void => {
        let direction;

        if (Object.hasOwn(tile, "x") && Object.hasOwn(tile, "y")) {
          if (tile.x == currentCoords.x + 1) direction = "right"; // moving right
          else if (currentCoords.x == tile.x + 1) direction = "left"; //moving left
          else if (tile.y == currentCoords.y + 1) direction = "down";
          else if (currentCoords.y == tile.y + 1) direction = "up";
        } else return;

        //depending on the previous tile, set the current tile type by where we are headed
        let currentIndex = getIndexFromCoords(currentCoords, width);
        if (currentDirection == "left") {
          if (direction == "right") {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
          } else {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
          }
        } else if (currentDirection == "up") {
          if (direction == "down") {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
          } else {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
          }
        } else if (currentDirection == "down") {
          if (direction == "up") {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
          } else {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
          }
        } else {
          if (direction == "left") {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
          } else {
            model.hotwire.squares[currentIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
          }
        }
        model.hotwire.squares[currentIndex].energizetype = getEnergizeImage(model.hotwire.squares[currentIndex].tiletype);

        //get ready for next tile
        currentCoords = { x: tile.x, y: tile.y };
        switch (direction) {
          case "left":
            currentDirection = "right";
            break;
          case "up":
            currentDirection = "down";
            break;
          case "down":
            currentDirection = "up";
            break;
          case "right":
            currentDirection = "left";
            break;
        }
      });
      //set last tile

      if (currentDirection == "left") {
        if (stopside == "top" || stopside == "bottom") {
          model.hotwire.squares[stoppingIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
        } else {
          model.hotwire.squares[stoppingIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
        }
      } else if (currentDirection == "up") {
        if (stopside == "bottom") {
          model.hotwire.squares[stoppingIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
        } else {
          model.hotwire.squares[stoppingIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
        }
      } else {
        if (stopside == "top") {
          model.hotwire.squares[stoppingIndex].tiletype = chance.pickone(["tiletype_straight", "tiletype_cross"]);
        } else {
          model.hotwire.squares[stoppingIndex].tiletype = chance.pickone(["tiletype_elbow", "tiletype_dblelbow"]);
        }
      }
      model.hotwire.squares[stoppingIndex].energizetype = getEnergizeImage(model.hotwire.squares[stoppingIndex].tiletype);

      //run init victory check
      if (model.hotwire.initFlag) checkForEnergizedSquares(width);
    },
    timeCheck: () => {
      if (!model.hotwire.timeIsRunning) {
        model.hotwire.timeIsRunning = true;
        model.hotwire.timeHandler = setInterval(() => {
          if (model.hotwire.timeremaining == 0) {
            model.hotwire.timeIsRunning = false;
            model.hotwire.victoryStatus = "UNSUCCESSFUL";
            model.hotwire.showFinalModal = true;
            clearInterval(model.hotwire.energizeHandler);
            model.hotwire.energizeHandler = 0;
            setTimeout(() => {
              model.hotwire.isHelpVisible = false;
              model.hotwire.showFinalModal = false;
              model.hotwire.isVisible = false;
              model.result = "UNSUCCESSFUL";
              clearInterval(model.hotwire.timeHandler);

              model.hotwire.timeHandler = 0;
            }, 2500);
          } else if (!model.hotwire.gamePaused) model.hotwire.timeremaining--;
        }, 1000);
      }
    },
    squareclick: (_e: any, model: any, el: any, a: any, object: any) => {
      if (
        object.$parent.$model.hotwire.victoryStatus == "VICTORY" ||
        object.$parent.$model.hotwire.victoryStatus == "UNSUCCESSFUL"
      )
        return;
      model.square.angle += 90;
    },
    energizeHandler: 0,
    squareRightClick: (_e: any, model: any, el: any, a: any, object: any) => {
      if (
        object.$parent.$model.hotwire.victoryStatus == "VICTORY" ||
        object.$parent.$model.hotwire.victoryStatus == "UNSUCCESSFUL"
      )
        return;
      model.square.angle -= 90;
    },
    solution: <any>[],
    closeGame: () => {
      CancelGame();
    },
    showFinalModal: false,
    showHelp: (event: any, model: any) => {
      model.hotwire.isHelpVisible = !model.hotwire.isHelpVisible;
      //pause timer
      model.hotwire.gamePaused = model.hotwire.isHelpVisible;
    },
    gamePaused: false,
    isHelpVisible: false,
    appwidth: 500,
    timeremaining: 10,
    get getTimeRemaining() {
      if (model.hotwire.timeremaining >= 10) {
        return model.hotwire.timeremaining.toString();
      } else {
        let rtrnSTring = model.hotwire.timeremaining.toString();
        return rtrnSTring.padStart(2, "0");
      }
    },
    timeIsRunning: false,
    timeHandler: 0,
  },
};
//<p>Seed is: \${seed}</p>
const template = `<div> 
    <div class='controls'> 
        <button \${click@=>launch}> launch minigame</button>
        <select>
            <option \${'easy' ==> level}>Easy</option>
            <option \${'med' ==> level}>Medium</option>
            <option \${'hard' ==> level}>Hard</option>
        </select>
        <input class="result" type="text" readonly \${value<==result}></input>  
        
    </div>
    <div class="minigame" \${===hotwire.isVisible} style="width:\${hotwire.appwidth}px">
        <div style="width: 100%;height:10%; "><span class="game_title">HOTWIRE THE LOCK</span></div>
        <div style="width: 100%;height:10%; "><span class="game_subtitle">Re-route the wiring to bypass the lock</span></div>
        <div class="pipFlex">
            <div class="pipButtons" \${click@=>hotwire.closeGame}>Exit</div>
            <div class="pipButtons" \${click@=>hotwire.showHelp}>Help</div>
        </div>
        <div class="timerflex">
            Time Remaining
            <div class="timer">0:\${hotwire.getTimeRemaining}</div>
        </div>    
        <div class="gameborder">
            <div class="gamebox">
                <div class="gamesquares \${square.tiletype} \${square.tilesize}" style="color: \${square.color}; background-color: \${square.bg}; rotate: \${square.angle}deg;" \${square<=*hotwire.squares} \${click@=>hotwire.squareclick} \${contextmenu@=>hotwire.squareRightClick}>
                  <div class="energized \${square.energizetype}" \${===square.energized} style="transform: rotate(\${square.energizedAngle}deg);background-position: \${square.energizeFrame}px 0px; background-size: \${square.energizeFramesize} \${square.energizetilesize};" ></div>              
    
                </div>
                <div class="startsquare"style="top: \${hotwire.startingSquareCoords.y}px; left: \${hotwire.startingSquareCoords.x}px"></div>
                <div class="stopsquare stop_\${square.stopside}" style="top: \${hotwire.stoppingSquareCoords.y}px; left: \${hotwire.stoppingSquareCoords.x}px"></div>
           </div>
        </div>
        <div class="helpModal" \${===hotwire.isHelpVisible}>
          <div class="helpText">
            <p>Instructions: Objective of game is to manipulate the electrical path from power to the bypass connection.</p>
            <p>Controls: left and right click on the tiles will rotate them clockwise/counter-clockwise</p>
            <p>GamePlay: The electrical signal will pass through the connetions as you make them showing your progress</p>
            <p>As the game becomes more difficult, there are more tiles and less time, the time starts as soon as game does</p>
          </div>
        </div>
        <div class="finalModal" \${===hotwire.showFinalModal}>
          <div class="modalText">\${hotwire.victoryStatus}</div>
        </div> 
    </div>
</div>`;

UI.create(document.body, template, model);

let globalAnimationFrame = 0;
let animationHandler = setInterval(() => {
  if (model.hotwire.isVisible) {
    globalAnimationFrame++;
    if (globalAnimationFrame == 10) globalAnimationFrame = 0;
  }
}, 100);

function getEnergizeImage(tile: string | undefined): string {
  switch (tile) {
    case "tiletype_straight":
      return "shock";
    case "tiletype_cross":
      return "shock";
    case "tiletype_dblelbow":
      return "shock_elbow";
    case "tiletype_elbow":
      return "shock_elbow";
    default:
      return "shock";
  }
}

function getEnergizeSize(tilesize: string): string {
  switch (tilesize) {
    case "tilesize_lrg":
      return animationFrameDims.large.size;
      break;
    case "tilesize_med":
      return animationFrameDims.medium.size;
      break;
    case "tilesize_small":
      return animationFrameDims.small.size;
      break;
  }

  return "";
}

function getAnimationFrame(tilesize: string): string {
  switch (tilesize) {
    case "tilesize_lrg":
      return animationFrameDims.large.frames[globalAnimationFrame];
      break;
    case "tilesize_med":
      return animationFrameDims.medium.frames[globalAnimationFrame];
      break;
    case "tilesize_small":
      return animationFrameDims.small.frames[globalAnimationFrame];
      break;
  }

  return "";
}

function getTileSize(tilesize: string) {
  switch (tilesize) {
    case "tilesize_lrg":
      return animationFrameDims.large.tilesize;
      break;
    case "tilesize_med":
      return animationFrameDims.medium.tilesize;
      break;
    case "tilesize_small":
      return animationFrameDims.small.tilesize;
      break;
  }

  return "";
}

function getPath(array: Array<any>, width: number, start: number, stop: number): Array<number> {
  let myPathFinder = new Pathfinder();
  let graph;

  switch (width) {
    case 3:
      graph = new Graph(myPathFinder, [
        [array[0].wall, array[3].wall, array[6].wall],
        [array[1].wall, array[4].wall, array[7].wall],
        [array[2].wall, array[5].wall, array[8].wall],
      ]);

      break;
    case 4:
      graph = new Graph(myPathFinder, [
        [array[0].wall, array[4].wall, array[8].wall, array[12].wall],
        [array[1].wall, array[5].wall, array[9].wall, array[13].wall],
        [array[2].wall, array[6].wall, array[10].wall, array[14].wall],
        [array[3].wall, array[7].wall, array[11].wall, array[15].wall],
      ]);
      break;
    case 5:
      graph = new Graph(myPathFinder, [
        [array[0].wall, array[5].wall, array[10].wall, array[15].wall, array[20].wall],
        [array[1].wall, array[6].wall, array[11].wall, array[16].wall, array[21].wall],
        [array[2].wall, array[7].wall, array[12].wall, array[17].wall, array[22].wall],
        [array[3].wall, array[8].wall, array[13].wall, array[18].wall, array[23].wall],
        [array[4].wall, array[9].wall, array[14].wall, array[19].wall, array[24].wall],
      ]);
      break;
    default:
      graph = new Graph(myPathFinder, [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ]);
  }

  let startx = start % width;
  let starty = Math.floor(start / width);
  let graphStart = graph.grid[startx][starty];
  let stopx = stop % width;
  let stopy = Math.floor(stop / width);
  let graphEnd = graph.grid[stopx][stopy];
  return myPathFinder.astar(graph, graphStart, graphEnd);
  //return [1, 2, 3];
}

function getIndexFromCoords(coords: any, width: number): number {
  return coords.x + coords.y * width;
}

function getConnectionPoints(index: number) {
  //based on tiletype and orientation
  //   --------------
  //   |     2      |
  //  1|            |
  //   |            |3
  //   |            |
  //   --------------
  //          4
  let angle = model.hotwire.squares[index].angle;

  switch (model.hotwire.squares[index].tiletype) {
    case "tiletype_straight":
      if (Math.abs(angle % 360) == 0 || Math.abs(angle % 360) == 180) {
        //left/right
        return [[1, 3]];
      } else {
        return [[2, 4]];
        //up/down
      }
      break;
    case "tiletype_cross":
      return [
        [1, 3],
        [2, 4],
      ];
      break;
    case "tiletype_elbow":
      if (angle % 360 == 0) {
        return [[1, 4]];
      } else if (angle % 360 == 90 || angle % 360 == -270) {
        return [[1, 2]];
      } else if (angle % 360 == 180 || angle % 360 == -180) {
        return [[2, 3]];
      } else if (angle % 360 == 270 || angle % 360 == -90) {
        return [[3, 4]];
      }

      break;
    case "tiletype_dblelbow":
      if (Math.abs(angle % 360) == 0) {
        return [
          [1, 4],
          [2, 3],
        ];
      } else if (Math.abs(angle % 360) == 90) {
        return [
          [1, 2],
          [3, 4],
        ];
      } else if (Math.abs(angle % 360) == 180) {
        return [
          [2, 3],
          [4, 1],
        ];
      } else if (Math.abs(angle % 360) == 270) {
        return [
          [3, 4],
          [1, 2],
        ];
      }
      break;
  }
  return [];
}

function checkForEnergizedSquares(width: number) {
  //clear all energized tiles
  model.hotwire.squares.forEach((sq: any) => (sq.energized = false));

  //start with starting index
  let sp = model.hotwire.startingSquare;
  let side = "left";
  let loopCntrl = true;
  let currentIndex = sp;
  while (loopCntrl) {
    let tile = model.hotwire.squares[currentIndex];
    if (tile == undefined) {
      loopCntrl = false;
    }
    //is cp on side
    let cps;
    let matching = 0;

    switch (side) {
      case "left":
        try {
          cps = tile.connectionPoints.some((cp: any) => cp.some((innerCP: any) => innerCP == 1)); //1 is left 2 is up 3 is right 4 is down
        } catch (error) {
          return;
        }
        matching = 1;

        break;
      case "up":
        try {
          cps = tile.connectionPoints.some((cp: any) => cp.some((innerCP: any) => innerCP == 2)); //1 is left 2 is up 3 is right 4 is down
        } catch (error) {
          return;
        }
        matching = 2;
        break;
      case "right":
        try {
          cps = tile.connectionPoints.some((cp: any) => cp.some((innerCP: any) => innerCP == 3)); //1 is left 2 is up 3 is right 4 is down
        } catch (error) {
          return;
        }
        matching = 3;
        break;
      case "down":
        try {
          cps = tile.connectionPoints.some((cp: any) => cp.some((innerCP: any) => innerCP == 4)); //1 is left 2 is up 3 is right 4 is down
        } catch (error) {
          return;
        }
        matching = 4;
        break;
    }

    if (cps) {
      //if y, energize, plus find matching connection point, then check next index

      if (tile.energized) {
        if (tile.tiletype == "tiletype_dblelbow") tile.energizetype = "shock_dbl_elbow";
        else if (tile.tiletype == "tiletype_cross") tile.energizetype = "shock_cross";
      } else tile.energized = true;
      //tile.energized = true;

      //energizedAngle code
      if (tile.tiletype == "tiletype_dblelbow") {
        if ((side == "left" && (tile.angle % 360 == 180 || tile.angle % 360 == 270)) || tile.angle % 360 == -90)
          tile.energizedAngle = 180;
        else if (side == "left") tile.energizedAngle = 0;
        if (side == "up" && (tile.angle % 360 == 0 || tile.angle % 360 == 270 || tile.angle % 360 == -90))
          tile.energizedAngle = 180;
        else if (side == "up") tile.energizedAngle = 0;
        if ((side == "down" && (tile.angle % 360 == 90 || tile.angle % 360 == 180)) || tile.angle % 360 == -270)
          tile.energizedAngle = 180;
        else if (side == "down") tile.energizedAngle = 0;
        if (side == "right" && (tile.angle % 360 == 90 || tile.angle % 360 == 0 || tile.angle % 360 == -270))
          tile.energizedAngle = 180;
        else if (side == "right") tile.energizedAngle = 0;
      } else if (tile.tiletype == "tiletype_cross") {
        if (side == "left" && (tile.angle % 360 == 90 || tile.angle % 360 == -90 || tile.angle % 360 == 270))
          tile.energizedAngle = 90;
        else if (side == "up" && (tile.angle % 360 == 0 || tile.angle % 360 == 180 || tile.angle % 360 == -180))
          tile.energizedAngle = 90;
        else if (side == "down" && (tile.angle % 360 == 0 || tile.angle % 360 == 180 || tile.angle % 360 == -180))
          tile.energizedAngle = 90;
        else if (side == "right" && (tile.angle % 360 == 90 || tile.angle % 360 == -90 || tile.angle % 360 == 270))
          tile.energizedAngle = 90;
        else tile.energizedAngle = 0;
      }

      //find next tile
      let matchedSide =
        tile.connectionPoints.filter((p: any) => p.includes(matching))[0]?.filter((p: any) => p !== matching)[0] ?? -1;

      //check for initial condition
      //&& currentIndex == model.hotwire.stoppingSquare
      if (model.hotwire.initFlag && model.hotwire.stoppingSquare == currentIndex) {
        let rslt = checkForVictory(side, matchedSide);
        if (rslt) {
          //reset tile angles
          console.log("RESET TILES");
          model.hotwire.onLoad();
          return;
        } else {
          model.hotwire.initFlag = false;
          model.hotwire.energizeHandler = setInterval(() => {
            checkForEnergizedSquares(width);
          }, 100);
        }
      } else checkForVictory(side, matchedSide);

      //you have to flip the direction, so 1 being the left of the current tile, would be the 'right' of the next tile
      let nextIndex = -1;
      switch (matchedSide) {
        case 1:
          side = "right";
          nextIndex = currentIndex - 1;
          break;
        case 2:
          side = "down";
          nextIndex = currentIndex - width;
          break;
        case 3:
          side = "left";
          nextIndex = currentIndex + 1;
          break;
        case 4:
          side = "up";
          nextIndex = currentIndex + width;
          break;
      }
      //ensure next index is valid, if it isn't, stop
      //if it is, next iteration

      let legitTile = true;
      if (tile.id % width == 0 && side == "right") legitTile = false; //left side tile, so can't come from right
      else if (tile.id < width && side == "down") legitTile = false; //top side tile, can't come from bottom
      else if (tile.id % width == width - 1 && side == "left") legitTile = false; //top side tile, can't come from left
      else if (Math.floor(tile.id / width) == width - 1 && side == "up") legitTile = false; //bottom side tile, can't come from left

      if (legitTile) {
        loopCntrl = true;
        currentIndex = nextIndex;
      } else {
        loopCntrl = false;
        if (model.hotwire.initFlag) {
          model.hotwire.initFlag = false;
          model.hotwire.energizeHandler = setInterval(() => {
            checkForEnergizedSquares(width);
          }, 100);
        }
      }
    } else {
      //if n, bomb out of loop
      debugFlag = false;
      loopCntrl = false;
      if (model.hotwire.initFlag) {
        model.hotwire.initFlag = false;
        model.hotwire.energizeHandler = setInterval(() => {
          checkForEnergizedSquares(width);
        }, 100);
      }
    }
  }
}

function checkTime() {
  model.hotwire.timeCheck();
}

function checkForVictory(side: string, matchedSide: number): boolean {
  //if stopping index square energized
  //start with stopping index
  let sp = model.hotwire.stoppingSquare;
  let tile = model.hotwire.squares[sp];
  let endingside = model.hotwire.stopOrientation;
  let init = model.hotwire.initFlag;

  //and if energy is passed to correct side
  if (tile.energized) {
    switch (matchedSide) {
      case 1:
        if (endingside == "left") {
          if (!init) runVictory();
          return true;
        }
        return false;
      case 2:
        if (endingside == "top") {
          if (!init) runVictory();
          return true;
        }
        return false;
      case 3:
        if (endingside == "right") {
          if (!init) runVictory();
          return true;
        }
        return false;
      case 4:
        if (endingside == "bottom") {
          if (!init) runVictory();
          return true;
        }
        return false;
    }
  } else return false;

  return false;
}

function CancelGame() {
  model.hotwire.isHelpVisible = false;
  model.hotwire.showFinalModal = false;
  model.hotwire.isVisible = false;
  model.result = "CANCELLED";
  clearInterval(model.hotwire.timeHandler);
  clearInterval(model.hotwire.energizeHandler);
  model.hotwire.timeHandler = 0;
  model.hotwire.energizeHandler = 0;
}

function runVictory() {
  model.hotwire.timeIsRunning = false;
  model.hotwire.victoryStatus = "VICTORY";
  model.hotwire.showFinalModal = true;
  clearInterval(model.hotwire.timeHandler);
  model.hotwire.timeHandler = 0;
  clearInterval(model.hotwire.energizeHandler);
  model.hotwire.energizeHandler = 0;
  setTimeout(() => {
    model.hotwire.isHelpVisible = false;
    model.hotwire.showFinalModal = false;
    model.hotwire.isVisible = false;
    model.result = "SUCCESS";
  }, 2500);
}
