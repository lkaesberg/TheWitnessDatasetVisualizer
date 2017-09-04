/*** Firefox compatibility ***/
if (!String.prototype.includes) {
  String.prototype.includes = function() {
    return String.prototype.indexOf.apply(this, arguments) !== -1
  }
}

document.pointerLockElement = document.pointerLockElement && document.mozPointerLockElement
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock
Element.prototype.requestPointerLock = Element.prototype.requestPointerLock || Element.prototype.mozRequestPointerLock
Event.prototype.movementX = Event.prototype.movementX || Event.prototype.mozMovementX
Event.prototype.movementY = Event.prototype.movementY || Event.prototype.mozMovementY

/*** End Firefox compatibility ***/

class Puzzle {
  // Javascript doesn't allow named parameters, so this constructor
  // isn't taking any additional arguments.
  constructor(width, height, pillar=false) {
    if (pillar) {
      height -= 0.5
    }
    this.grid  = this.newGrid(2*width+1, 2*height+1)
    this.start = {'x':2*width, 'y':0}
    this.end   = {'x':0, 'y':2*height}
    this.dots  = []
    this.gaps  = []
    this.regionCache = {}
    this.pillar = pillar
  }

  newGrid(width, height) { // FIXME: Should this just be puzzle.clearGrid?
    var grid = []
    for (var i=0; i<width; i++) {
      grid[i] = []
      for (var j=0; j<height; j++) {
        grid[i][j] = false
      }
    }
    return grid
  }
  
  // FIXME: Find a way to use prototyping to avoid implementing getters and setters
  getCell(x, y) {
    if (x < 0 || x >= this.grid.length) {
      return true
    }
    if (y < 0) {
      if (this.pillar) {
        y = (y % this.grid[x].length) + this.grid[x].length
      } else {
        return true
      }
    }
    if (y >= this.grid[x].length) {
      if (this.pillar) {
        y = (y % this.grid[x].length)
      } else {
        return true
      }
    }
    return this.grid[x][y]
  }
  
  setCell(x, y, value) {
    if (x < 0 || x >= this.grid.length) {
      return true
    }
    if (y < 0) {
      if (this.pillar) {
        y = (y % this.grid[x].length) + this.grid[x].length
      } else {
        throw (x, y), "is out of bounds"
      }
    }
    if (y >= this.grid[x].length) {
      if (this.pillar) {
        y = (y % this.grid[x].length)
      } else {
        throw (x, y), "is out of bounds"
      }
    }
    this.grid[x][y] = value
  }
  
  isEndpoint(x, y) {
    if (x < 0 || x >= this.grid.length) {
      return false
    }
    if (y < 0) {
      if (this.pillar) {
        y = (y % this.grid[x].length) + this.grid[x].length
      } else {
        return false
      }
    }
    if (y >= this.grid[x].length) {
      if (this.pillar) {
        y = (y % this.grid[x].length)
      } else {
        return false
      }
    }
    return (x == this.end.x && y == this.end.y)
  }
  
  clone() {
    var copy = new Puzzle(0, 0)
    copy.grid = this.copyGrid()
    copy.start = {'x':this.start.x, 'y':this.start.y}
    copy.end = {'x':this.end.x, 'y':this.end.y}
    copy.dots = this.dots.slice()
    copy.gaps = this.gaps.slice()
    copy.regionCache = this.regionCache
    copy.pillar = this.pillar
    return copy
    /*
    return {
      'grid':this.copyGrid(this.grid),
      'start':{'x':this.start.x, 'y':this.start.y},
      'end':{'x':this.end.x, 'y':this.end.y},
      'dots':this.dots.slice(),
      'gaps':this.gaps.slice(),
      'regionCache':this.regionCache,
      'pillar':this.pillar
    }
    */
  }

  copyGrid() {
    var new_grid = []
    for (var row of this.grid) {
      new_grid.push(row.slice())
    }
    return new_grid
  }
  
  _innerLoop(x, y, region) {
    if (this.getCell(x, y) == 2) {
      delete this.potentialRegions[x+'_'+y]
    }
    region.push({'x':x, 'y':y})
    this.setCell(x, y, true)
    
    if (this.getCell(x+2, y) == true) { // Already visited, do nothing
    } else if (this.getCell(x+1, y) == true) { // Unvisited and potentially disconnected
      this.potentialRegions[(x+2)+'_'+y] = true
      this.setCell(x+2, y, 2)
    } else { // Unvisited and connected
      this._innerLoop(x+2, y, region)
    }

    if (this.getCell(x-2, y) == true) { // Already visited, do nothing
    } else if (this.getCell(x-1, y) == true) { // Unvisited and potentially disconnected
      this.potentialRegions[(x-2)+'_'+y] = true
      this.setCell(x-2, y, 2)
    } else { // Unvisited and connected
      this._innerLoop(x-2, y, region)
    }

    if (this.getCell(x, y+2) == true) { // Already visited, do nothing
    } else if (this.getCell(x, y+1) == true) { // Unvisited and potentially disconnected
      this.potentialRegions[x+'_'+(y+2)] = true
      this.setCell(x, y+2, 2)
    } else { // Unvisited and connected
      this._innerLoop(x, y+2, region)
    }

    if (this.getCell(x, y-2) == true) { // Already visited, do nothing
    } else if (this.getCell(x, y-1) == true) { // Unvisited and potentially disconnected
      this.potentialRegions[x+'_'+(y-2)] = true
      this.setCell(x, y-2, 2)
    } else { // Unvisited and connected
      this._innerLoop(x, y-2, region)
    }
  }
  
  getRegions() {
    var savedGrid = this.copyGrid()
    this.potentialRegions = {'1_1': true}
    this.setCell(1, 1, 2)
    var regions = []
    while (Object.keys(this.potentialRegions).length > 0) {
      var pos = Object.keys(this.potentialRegions)[0]
      var x = parseInt(pos.split('_')[0])
      var y = parseInt(pos.split('_')[1])
      if (this.getCell(x, y) != 2) {
        delete this.potentialRegions[pos]
        continue
      }
      var region = []
      this._innerLoop(x, y, region)
      regions.push(region)
    }
    this.grid = savedGrid
    if (window.debug) {
      console.log(regions)
    }
    return regions
  }
}

function _copyGrid(grid) { // FIXME: Deprecated
  var new_grid = []
  for (var row of grid) {
    new_grid.push(row.slice())
  }
  return new_grid
}

// A 2x2 grid is internally a 5x5:
// corner, edge, corner, edge, corner
// edge,   cell, edge,   cell, edge
// corner, edge, corner, edge, corner
// edge,   cell, edge,   cell, edge
// corner, edge, corner, edge, corner
//
// Corners and edges will have a value of true if the line passes through them
// Cells will contain an object if there is an element in them
function _newGrid(width, height) {
  console.info('FIXME: Deprecated, use puzzle.newGrid instead')
  var grid = []
  for (var i=0; i<2*width+1; i++) {
    grid[i] = []
    for (var j=0; j<2*height+1; j++) {
      grid[i][j] = false
    }
  }
  return grid
}

// Returns the contiguous regions on the grid, as arrays of points.
// The return array may contain empty cells.
function _getRegions(grid) {
  console.info('FIXME: Deprecated, use puzzle.getRegions instead')
  var colors = []
  for (var x=0; x<grid.length; x++) {
    colors[x] = []
    for (var y=0; y<grid[x].length; y++) {
      colors[x][y] = 0
    }
  }

  var regions = []
  var unvisited = [{'x':1, 'y':1}]
  var localRegion = []

  while (unvisited.length > 0) {
    regions[regions.length] = []
    localRegion.push(unvisited.pop())
    while (localRegion.length > 0) {
      var cell = localRegion.pop()
      if (colors[cell.x][cell.y] != 0) {
        continue
      } else {
        colors[cell.x][cell.y] = regions.length
        regions[regions.length-1].push(cell)
      }
      if (cell.x < colors.length-2 && colors[cell.x+2][cell.y] == 0) {
        if (grid[cell.x+1][cell.y] == 0) {
          localRegion.push({'x':cell.x+2, 'y':cell.y})
        } else {
          unvisited.push({'x':cell.x+2, 'y':cell.y})
        }
      }
      if (cell.y < colors[cell.x].length-2 && colors[cell.x][cell.y+2] == 0) {
        if (grid[cell.x][cell.y+1] == 0) {
          localRegion.push({'x':cell.x, 'y':cell.y+2})
        } else {
          unvisited.push({'x':cell.x, 'y':cell.y+2})
        }
      }
      if (cell.x > 1 && colors[cell.x-2][cell.y] == 0) {
        if (grid[cell.x-1][cell.y] == 0) {
          localRegion.push({'x':cell.x-2, 'y':cell.y})
        } else {
          unvisited.push({'x':cell.x-2, 'y':cell.y})
        }
      }
      if (cell.y > 1 && colors[cell.x][cell.y-2] == 0) {
        if (grid[cell.x][cell.y-1] == 0) {
          localRegion.push({'x':cell.x, 'y':cell.y-2})
        } else {
          unvisited.push({'x':cell.x, 'y':cell.y-2})
        }
      }
    }
  }

  // console.log('Computed region map, colors:', colors)
  return regions
}

// http://stackoverflow.com/q/901115
var urlParams
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) {return decodeURIComponent(s.replace(pl, ' '))},
        query  = window.location.search.substring(1)

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2])
})()

var styles = {
  'monday':{
    'width':4, 'height':4, 'colors':2, 'difficulty':[50, 100],
    'distribution':{
      'squares':4,
      'stars':4,
    }
  },
  'tuesday':{
    'width':4, 'height':4, 'colors':2, 'difficulty':[1, 9999],
    'distribution':{
      'stars':5,
      'negations':1,
      'dots':25,
    }
  },
  'wednesday':{
    'width':4, 'height':4, 'colors':1, 'difficulty':[1, 9999],
    'distribution':{
      'polyominos':3,
      'triangles':2,
    }
  },
  'thursday':{
    'width':5, 'height':5, 'colors':3, 'difficulty':[1, 9999],
    'distribution':{
      'polyominos':3,
      'stars':4,
    }
  },
  'friday':{
    'width':5, 'height':5, 'colors':1, 'difficulty':[1, 9999],
    'distribution':{
      'triangles':12,
      'negations':2,
    }
  },
  'saturday':{ // FIXME
    'width':5, 'height':5, 'colors':3, 'difficulty':[1, 9999],
    'distribution': {
      'stars':4,
      'polyominos':2,
      'onimoylops':2,
    }
    // symmetry: 1
  },
  'sunday':{
//    'width':6, 'height':6, 'colors':1, 'difficulty':[1, 9999],
    'width':5, 'height':5, 'colors':1, 'difficulty':[1, 9999],
    'distribution':{
      'triangles':1,
      'polyominos':1,
      'stars':1,
      'squares':1,
      'negations':1,
      'dots':1,
      'gaps':1,
    }
    // pillar: 1
  },
}

// From the random panels
RED = '#923A5E'
ORANGE = '#C5714F'
GREEN = '#58864C'
BLUE = '#5697A2'
PURPLE = '#785DAE'

