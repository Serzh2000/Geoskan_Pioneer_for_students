local unpack = table.unpack

local points = {
  {0, 0, 1.3},
  {0, 1.6, 1.3}
}

local curr = 1
local route = {}
local takeoff_done = false
local mission_done = false
local landing_requested = false
local disarmed = false
local takeoff_tries = 0
local max_takeoff_tries = 8

local function buildRouteFromRing()
  local sx, sy, _ = unpack(points[1])
  local rx, ry, rz = unpack(points[2])

  local dx = rx - sx
  local dy = ry - sy
  local len = math.sqrt(dx * dx + dy * dy)

  if len < 0.001 then
    dx = 0
    dy = 1
    len = 1
  end

  local ux = dx / len
  local uy = dy / len

  local approach_dist = 0.6
  local exit_dist = 0.8

  local ax = rx - ux * approach_dist
  local ay = ry - uy * approach_dist

  local ex = rx + ux * exit_dist
  local ey = ry + uy * exit_dist

  route = {
    {ax, ay, rz},
    {rx, ry, rz},
    {ex, ey, rz}
  }
end

local function nextPoint()
  if curr <= #route then
    local x, y, z = unpack(route[curr])
    ap.goToLocalPoint(x, y, z)
    curr = curr + 1
  elseif not mission_done then
    mission_done = true
    landing_requested = true
    ap.push(Ev.MCE_LANDING)
  end
end

local takeoffTimer

local function requestTakeoff()
  if not takeoff_done and not mission_done and takeoff_tries < max_takeoff_tries then
    takeoff_tries = takeoff_tries + 1
    print("TAKEOFF TRY:", takeoff_tries)
    ap.push(Ev.MCE_TAKEOFF)
  else
    if takeoffTimer then takeoffTimer:stop() end
  end
end

buildRouteFromRing()
ap.push(Ev.MCE_PREFLIGHT)

takeoffTimer = Timer.new(3.0, requestTakeoff)
takeoffTimer:start()

function callback(event)
  print("EVENT:", event)

  if event == Ev.TAKEOFF_COMPLETE then
    takeoff_done = true
    nextPoint()
  end

  if event == Ev.POINT_REACHED then
    if takeoff_done and not mission_done then
      nextPoint()
    end
  end

  if event == Ev.SHOCK then
    mission_done = true
    landing_requested = true
    ap.push(Ev.MCE_LANDING)
  end

  if event == Ev.COPTER_LANDED then
    if (mission_done or landing_requested or takeoff_done) and not disarmed then
      disarmed = true
      ap.push(Ev.ENGINES_DISARM)
    end
  end
end
