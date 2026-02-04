import "./Documentation.css";
import { Link } from "react-router-dom";

export default function Documentation() {
  return (
    <div className="docs-container">
      <div className="docs-content">
        <Link to="/">&larr; Back to Editor</Link>
        
        <h1>Documentation</h1>

        <section id="Zero">
          <h2>Zero</h2>
          <p>
            The zero function ignores all inputs and returns 0.
          </p>
          <p><code>z(x) = 0</code></p>
          <div className="docs-example">
            <div>Input: 5</div>
            <div>Output: 0</div>
          </div>
        </section>

        <section id="Successor">
          <h2>Successor</h2>
          <p>
            The successor function adds 1 to its input.
          </p>
          <p><code>s(x) = x + 1</code></p>
          <div className="docs-example">
            <div>Input: 4</div>
            <div>Output: 5</div>
          </div>
        </section>

        <section id="Projection">
          <h2>Projection</h2>
          <p>
            The projection function returns the i-th input from a list of arguments.
          </p>
          <p><code>p(i, x...) = x[i]</code></p>
          <div className="docs-example">
            <div>Parameter i: 2</div>
            <div>Inputs: 10, 20, 30</div>
            <div>Output: 20</div>
          </div>
        </section>

        <section id="Composition">
          <h2>Composition</h2>
          <p>
            Composition chains functions together. It takes n inner functions, each with an arity of m, and feeds their outputs into an outer function with an arity of n.
          </p>
          <p>
            <code>
              Cn[f, g<sub>1</sub>, …, g<sub>n</sub>](x<sub>1</sub>, …, x<sub>m</sub>) = f(g<sub>1</sub>(x<sub>1</sub>, …, x<sub>m</sub>), …, g<sub>n</sub>(x<sub>1</sub>, …, x<sub>m</sub>))  
            </code>
          </p>
          <div className="docs-example">
            <div>Example: the constant 1 function. For any x, this function returns 1.</div>
            <div>Cn[s, z](x) = s(z(x)) = s(0) = 1</div>
            <div> </div>
            <div>f (the outer function) is s (the successor function) and g<sub>1</sub> (inner function 1) is z (the zero function).</div>
          </div>
        </section>

        <section id="Primitive Recursion">
          <h2>Primitive Recursion</h2>
          <p>
            Primitive Recursion handles iteration. It uses a base case (for 0) and a recursive case (for n+1).
          </p>
          <div>
            <div>Given functions <code>f(x<sub>1</sub>, …, x<sub>n</sub>)</code> and <code>g(x<sub>1</sub>, …, x<sub>n</sub>, y, z)</code>,
             the primitive recursion function is defined as follows:</div>
            <code>Pr[f, g](x<sub>1</sub>, …, x<sub>n</sub>, 0) = f(x<sub>1</sub>, …, x<sub>n</sub>)</code>
            <div> </div>
            <code>Pr[f, g](x<sub>1</sub>, …, x<sub>n</sub>, y') = g(x<sub>1</sub>, …, x<sub>n</sub>, y, Pr[f, g](x<sub>1</sub>, …, x<sub>n</sub>, y))</code>
          </div>
          <div className="docs-example">
            Example:
          </div>
        </section>

        <section id="Minimization">
          <h2>Minimization</h2>
          <p>
            <strong>Minimization</strong> searches for the smallest number that satisfies a condition (outputs 0).
          </p>
          <div className="docs-example">
Find smallest n where f(x, n) == 0.
          </div>
        </section>
      </div>
    </div>
  );
}
