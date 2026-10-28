import type { TOC } from '@ember/component/template-only';

// A file of the example, as it is in the repository
const SourceCode: TOC<{
  Args: { name: string; code: string; open?: boolean };
}> = <template>
  <details class="source" open={{@open}}>
    <summary><code>{{@name}}</code></summary>
    <pre><code>{{@code}}</code></pre>
  </details>
</template>;

export default SourceCode;
