class TXTResult:

    def __init__(self, cid, testset):
        self.cid = cid
        self.testset = testset
        
    def __str__(self):
        return self.testset
