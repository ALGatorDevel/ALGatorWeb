import si.fri.algotest.entities.VariableSet;
import si.fri.algotest.entities.EVariable;
import si.fri.algotest.entities.VariableType;
import si.fri.algotest.entities.TestCase;
import si.fri.algotest.execute.AbsAlgorithm;
import si.fri.algotest.global.ErrorStatus;
import sun.awt.geom.AreaOp;

import java.io.Serializable;
import java.sql.SQLOutput;
import java.util.ArrayList;
import java.util.List;


/**
 *
 * @author matic
 */
public abstract class BinPackingAbsAlgorithm extends AbsAlgorithm {

  private BinPackingTestCase binPackingTestCase;
  private Result result;

  @Override
  public TestCase getTestCase() {
    return binPackingTestCase;
  }

  @Override
  public ErrorStatus init(TestCase test) {
    if (test instanceof BinPackingTestCase) {
      binPackingTestCase = (BinPackingTestCase) test;
      return ErrorStatus.STATUS_OK;
    } else
      return ErrorStatus.setLastErrorMessage(ErrorStatus.ERROR_CANT_PERFORM_TEST, "Invalid test:" + test);
  }
  
  @Override
  public void run() {
    result = execute(binPackingTestCase.arrayOfVolumes, binPackingTestCase.binCapacity);
  }


  private boolean checkCorrectness() {
    for (Bin bin : result.bins) {
      float sum = bin.filledValue();
      // Check that bins' content don't exceed bin capacity.
      if (sum > binPackingTestCase.binCapacity) {
        return false;
      }
      // Check that bins are not empty.
      if (sum == 0) {
        return false;
      }
    }
    // Number of bins needed should be at most number of objects.
    if (result.bins.size() > binPackingTestCase.arrayOfVolumes.length) {
      return false;
    }
    return true;
  }

  public double calculateRatio() {
    return (double) result.minNumberOfBins / binPackingTestCase.minNumberOfBins;
  }
  
  @Override
  public VariableSet done() {
    VariableSet variables = new VariableSet(binPackingTestCase.getParameters());
    // TODO: calculate indicators and set variable values
    String correctness = checkCorrectness() ? "OK" : "NOK";
    EVariable passVar = new EVariable("Check", VariableType.STRING, correctness);
    variables.addVariable(passVar, true);

    double ratio = calculateRatio();
    EVariable ratioVar = new EVariable("Ratio", VariableType.DOUBLE, ratio);
    variables.addVariable(ratioVar, true);

    int nObjects = binPackingTestCase.arrayOfVolumes.length;
    EVariable nObjectsVar = new EVariable("nObjects", VariableType.INT, nObjects);
    variables.addVariable(nObjectsVar, true);

    return variables;
  }   

  protected abstract Result execute(double[] volumes, double binCapacity);
  
}


class Result implements Serializable {
  public int minNumberOfBins;
  public List<Bin> bins;

  public Result(int minNumberOfBins, List<Bin> bins) {
    this.minNumberOfBins = minNumberOfBins;
    this.bins = bins;
  }

}

class Bin implements Serializable {
  public List<Double> contents;
  public double capacityLeft;

  public Bin(double binCapacity) {
    contents = new ArrayList<>();
    capacityLeft = binCapacity;
  }



  public boolean add(double volume) {
    // Check if object fits in bin.
    if (volume <= capacityLeft) {
      contents.add(volume);
      capacityLeft -= volume;
      return true;
    }
    return false;
  }

  public boolean isEmpty() {
    return contents.isEmpty();
  }

  public boolean remove(double volume) {
    boolean success = contents.remove(volume);
    if (success) {
      capacityLeft += volume;
    }
    return success;
  }

  public float filledValue() {
    float sum = 0;
    for (double volume : contents) {
      sum += volume;
    }
    return sum;
  }
}