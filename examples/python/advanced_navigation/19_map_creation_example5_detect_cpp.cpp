#include <opencv2/opencv.hpp>
#include <opencv2/aruco.hpp>
#include <iostream>

using namespace cv;
using namespace std;

int main() {
    // 1. Настройка словаря ArUco (6x6, 50 маркеров - стандарт для Pioneer)
    Ptr<aruco::Dictionary> dictionary = aruco::getPredefinedDictionary(aruco::DICT_6X6_50);
    Ptr<aruco::DetectorParameters> parameters = aruco::DetectorParameters::create();

    // 2. Подключение к камере (индекс 0 - первая камера)
    VideoCapture inputVideo(0);
    if (!inputVideo.isOpened()) {
        cerr << "Ошибка открытия камеры!" << endl;
        return -1;
    }

    cout << "Нажмите ESC для выхода..." << endl;

    while (inputVideo.grab()) {
        Mat image, imageCopy;
        inputVideo.retrieve(image);
        image.copyTo(imageCopy);

        std::vector<int> ids;
        std::vector<std::vector<Point2f>> corners;

        // 3. Детекция маркеров
        aruco::detectMarkers(image, dictionary, corners, ids, parameters);

        // Если маркеры найдены
        if (ids.size() > 0) {
            aruco::drawDetectedMarkers(imageCopy, corners, ids);
            
            cout << "Вижу маркеры: ";
            for(int id : ids) cout << id << " ";
            cout << endl;
        }

        // Показываем изображение
        imshow("Pioneer Camera C++", imageCopy);

        char key = (char)waitKey(10);
        if (key == 27) break; // ESC
    }

    return 0;
}
