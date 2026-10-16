class Marker:
    def __init__(self, marker_id, size, x, y, z, yaw=0, dictionary="DICT_6X6_250"):
        self.id = marker_id
        self.size = size  # in meters
        self.x = x        # local x (meters)
        self.y = y        # local y (meters)
        self.z = z        # local z (meters) - height
        self.yaw = yaw    # orientation (degrees)
        self.dictionary = dictionary
