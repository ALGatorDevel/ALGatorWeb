import si.fri.algotest.execute.AbstractAlgorithm;

/**
 *
 * @author tadej
 */
public abstract class MedianAbsAlgorithm extends AbstractAlgorithm {
 
  @Override
  public MedianTestCase getCurrentTestCase() {
    return (MedianTestCase) super.getCurrentTestCase(); 
  }

  protected abstract MedianOutput execute(MedianInput medianInput);

  @Override
  public void run() {    
    algorithmOutput = execute(getCurrentTestCase().getInput());
  }
}