import "./DocsPage.css";

export default function DocsPage() {
  return (
    <div className="docs-container">
      <div className="docs-content">
        <a href="#">&larr; Back to Editor</a>

        <h1>Documentation</h1>

        <section id="Keybinds">
          <h2>Keybinds</h2>
          <p><code>Ctrl/Cmd + Shift + S</code> Save current workspace.</p>
          <p><code>Ctrl/Cmd + O</code> Load a <code>.bramflower</code> file.</p>
          <p><code>Backspace/Delete</code> Remove selected block.</p>
        </section>

        <section id="Primitive-Recursion-Panel">
          <h2>Primitive Recursion Panel</h2>
          <p>This toggleable panel appears for Primitive Recursion blocks and shows one recursion step at a time.</p>
          <p><code>x,y'</code>: Inputs for the current recursion level.</p>
          <p><code>x,y</code>: Inputs for the connected lower level (<code>y = y' - 1</code>). At base case it stays at <code>y = 0</code> and does not descend further.</p>
          <p><code>h(x,y)</code>: Result returned from that lower level (blank until available).</p>
          <p><code>h(x,y')</code>: Result at the current level (blank until this level exits).</p>
        </section>

        <section id="Batch-Compute">
          <h2>Batch Compute</h2>
          <p>Use Batch Compute to evaluate the root function across multiple input sets, skipping visualization.</p>
          <p>Open the modal, enter one input tuple per row, run the batch, and review outputs.</p>
        </section>

        <section id="Functions">
          <h2>Functions</h2>

          <div className="docs-function" id="Zero">
            <h3>Zero</h3>
            <p>The zero function ignores all inputs and returns 0.</p>
            <p><code>z(x) = 0</code></p>
            <div className="docs-example">
              <div>Input: 5</div>
              <div>Output: 0</div>
            </div>
          </div>

          <div className="docs-function" id="Successor">
            <h3>Successor</h3>
            <p>The successor function adds 1 to its input.</p>
            <p><code>s(x) = x + 1</code></p>
            <div className="docs-example">
              <div>Input: 4</div>
              <div>Output: 5</div>
            </div>
          </div>

          <div className="docs-function" id="Identity">
            <h3>Identity</h3>
            <p>The identity function (also known as projection) returns the m-th input from its given inputs.</p>
            <p><code>id<sup>n</sup><sub>m</sub>(x<sub>1</sub>, x<sub>2</sub>, ..., x<sub>n</sub>) = x<sub>m</sub></code></p>
            <div className="docs-example">
              <div>Arity (n): 3</div>
              <div>Parameter (m): 2</div>
              <div>Inputs: 10, 20, 30</div>
              <div>Output: 20</div>
            </div>
          </div>

          <div className="docs-function" id="Composition">
            <h3>Composition</h3>
            <p>Composition chains functions together. It takes n inner functions, each with an arity of m, and feeds their outputs into an outer function with an arity of n.</p>
            <p>
              <code>
                Cn[f, g<sub>1</sub>, ..., g<sub>n</sub>](x<sub>1</sub>, ..., x<sub>m</sub>) = f(g<sub>1</sub>(x<sub>1</sub>, ..., x<sub>m</sub>), ..., g<sub>n</sub>(x<sub>1</sub>, ..., x<sub>m</sub>))
              </code>
            </p>
            <div className="docs-example">
              <div>Example: the constant 1 function. For any x, this function returns 1.</div>
              <div>Cn[s, z](x) = s(z(x)) = s(0) = 1</div>
              <div> </div>
              <div>f (the outer function) is s (the successor function) and g<sub>1</sub> (inner function 1) is z (the zero function).</div>
            </div>
          </div>

          <div className="docs-function" id="Primitive-Recursion">
            <h3>Primitive Recursion</h3>
            <p>
              Primitive recursion builds a function in stages by counting down on the last input to a base case, then 
              building the result back up. The base-case function <code>f</code> gives the output when that last input is 
              <code>0</code>. The recursive-case function <code>g</code> says how to get the next output from the previous 
              one when the last input is positive. Here <code>x<sub>1</sub>, ..., x<sub>n</sub></code> are the other inputs 
              carried through each stage, <code>y'</code> means the successor of <code>y</code> (so <code>y' = y + 1</code>, 
              equivalently <code>y = y' - 1</code>), and <code>z</code> names the previous recursive value 
              <code>Pr[f, g](x<sub>1</sub>, ..., x<sub>n</sub>, y)</code> that <code>g</code> uses to produce 
              <code>Pr[f, g](x<sub>1</sub>, ..., x<sub>n</sub>, y')</code>.
            </p>
            <p>Given functions <code>f(x<sub>1</sub>, ..., x<sub>n</sub>)</code> and <code>g(x<sub>1</sub>, ..., x<sub>n</sub>, y, z)</code>, primitive recursion is defined as follows:</p>
            <p>
              <code>Pr[f, g](x<sub>1</sub>, ..., x<sub>n</sub>, 0) = f(x<sub>1</sub>, ..., x<sub>n</sub>)</code>
            </p>
            <p>
              <code>Pr[f, g](x<sub>1</sub>, ..., x<sub>n</sub>, y') = g(x<sub>1</sub>, ..., x<sub>n</sub>, y, Pr[f, g](x<sub>1</sub>, ..., x<sub>n</sub>, y))</code>
            </p>

            <div className="docs-example">
              <div>Example: addition by primitive recursion.</div>
              <div>Define Add(x, y) = Pr[f, g](x, y), with:</div>
              <div>f(x) = x</div>
              <div>g(x, y, z) = s(z) = z + 1</div>
              <div> </div>
              <div>So Add(x, 0) = f(x) = x, and Add(x, y') = s(Add(x, y)).</div>
              <div> </div>
              <div>Compute Add(2, 3):</div>
              <div>Add(2, 3) = s(Add(2, 2))</div>
              <div>Add(2, 2) = s(Add(2, 1))</div>
              <div>Add(2, 1) = s(Add(2, 0))</div>
              <div>Add(2, 0) = 2</div>
              <div>Therefore Add(2, 1) = 3, and so on until Add(2, 3) returns 5.</div>
            </div>
          </div>

          <div className="docs-function" id="Minimization">
            <h3>Minimization</h3>
            <p>Minimization searches for the smallest number that satisfies a condition (outputs 0).</p>
            <div className="docs-example">
              Find smallest n where f(x, n) == 0.
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
