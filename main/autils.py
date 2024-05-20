import base64
import time

# array that keeps elements only expiration_period (in seconds) of time;
# outdated elements are deleted before any other action (add, contains, ...) is performed
class AutoDeleteArray:
    def __init__(self, expiration_period):
        self.array = []
        self.expiration_period = expiration_period

    def deleteOutdated(self):
        current_time = time.time()
        self.array = [(elem, timestamp) for elem, timestamp in self.array if current_time - timestamp <= self.expiration_period]

    def add_element(self, element):
        self.deleteOutdated()
        self.array.append((element, time.time()))
    def get_elements(self):
        self.deleteOutdated()
        return [element for element, _ in self.array]

    def contains(self, element):
        return element in self.get_elements()

def file_to_base64(file_path):
    with open(file_path, 'rb') as file:
        binary_data = file.read()
        base64_data = base64.b64encode(binary_data).decode('utf-8')
        return base64_data


