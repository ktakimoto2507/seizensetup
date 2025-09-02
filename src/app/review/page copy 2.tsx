      <div className="flex gap-2 justify-end">
        <Button onClick={() => router.push("/assets")} type="button">戻る</Button>
        <Button
          onClick={() => {
            // ブラウザの印刷ダイアログ → PDF保存可
            window.print();
          }}
          type="button"
        >
          印刷（PDF出力）
        </Button>
        <Button onClick={submit} type="button">送信（ダミー）</Button>
      </div>
