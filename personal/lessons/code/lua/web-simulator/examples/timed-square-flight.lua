-- Register the route timers once at script startup (20, 30, ... 90 seconds).
local routeStarted = false

function callback(event)
    if event ~= Ev.TAKEOFF_COMPLETE or routeStarted then
        return
    end
    routeStarted = true

    ap.goToLocalPoint(0, 0, 1)
end

ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(1, function()
    ap.push(Ev.MCE_TAKEOFF)
end)

Timer.callLater(20, function()
    ap.goToLocalPoint(0, 1, 1)
end)
Timer.callLater(30, function()
    ap.goToLocalPoint(1, 1, 1)
end)
Timer.callLater(40, function()
    ap.goToLocalPoint(1, -1, 1)
end)
Timer.callLater(50, function()
    ap.goToLocalPoint(-1, -1, 1)
end)
Timer.callLater(60, function()
    ap.goToLocalPoint(-1, 1, 1)
end)
Timer.callLater(70, function()
    ap.goToLocalPoint(0, 1, 1)
end)
Timer.callLater(80, function()
    ap.push(Ev.MCE_LANDING)
end)
Timer.callLater(90, function()
    ap.push(Ev.ENGINES_DISARM)
end)
