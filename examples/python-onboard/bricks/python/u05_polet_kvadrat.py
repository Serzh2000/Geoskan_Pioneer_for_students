pioneer.arm()
pioneer.takeoff()
pioneer.go_to_local_point(0,0,1,0,0)
while not pioneer.point_reached():
    pass
pioneer.go_to_local_point(1,0,1,0,0)
while not pioneer.point_reached():
    pass
pioneer.go_to_local_point(1,1,1,0,0)
while not pioneer.point_reached():
    pass
pioneer.go_to_local_point(0,1,1,0,0)
while not pioneer.point_reached():
    pass
pioneer.go_to_local_point(0,0,1,0,0)
while not pioneer.point_reached():
    pass
pioneer.land()
